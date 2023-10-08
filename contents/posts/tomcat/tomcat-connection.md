---
layout: post
title: "Tomcat은 어떻게 Connection을 관리할까?"
tags:
  - Tomcat
lang: ko-KR
date: 2023-10-07
update: 2023-10-07
---

## 개요
[지난 게시물](https://px201226.github.io/tomcat/)에서는 Tomcat의 아키텍처와 클라이언트와의 연결 방식, 그리고 요청 처리 메커니즘에 대해 알아보았다.
특히, NIO Connector의 Selector를 활용한 이벤트 루프 처리 방식은 BIO Connector에 비해 훨씬 더 많은 연결을 효율적으로 관리하면서 요청을 처리할 수 있게 만들었다.

이번 게시물에서는 Tomcat이 Selector를 통해 관리하는 수 많은 연결들을 타임아웃 관점에서 어떻게 관리하는지에 대해 살펴본다.

## Tomcat의 타임아웃 관리
네트워크에서 발생할 수 있는 타임아웃에는 크게 3-way-handshake 중 발생하는 Connection Timeout, Read Timeout, Write Timeout 이 있다.
이 중 톰캣과 같은 서버 측에서 Connection Timeout은 핸들링 할 수 없는데, 그 이유는 서버에서는 클라이언트 요청을 받기 위해 무한정 대기하고 핸드 쉐이크 중 에러가 발생하더라도
TCP/IP 스택에서 자동으로 처리되기 때문이다.

네트워크 상에서 Read/Write Timeout 의미는 데이터를 read/write 위해 최대 대기하는 시간을 의미한다.
예를 들어 socket.read()에 타임아웃을 10초로 설정했다면, 이는 소켓에서 데이터를 읽기 시작하기 전에 최대 10초 동안 대기할 수 있다는 것을 의미한다.
만약 9초에 첫 번째 패킷이 도착하고 15초에 모든 패킷 전송이 끝나더라도, socket.read()는 이미 데이터를 읽기 시작했기 때문에 타임아웃이 발생하지 않는다.
즉, 타임아웃은 데이터가 처음으로 도착하기 전 최대 대기 시간을 말한다. 데이터가 도착하기 시작한 후에는 타임아웃은 적용되지 않는다.

Spring/Tomcat 에서는 아래와 같은 Timeout 속성을 제공한다. 

- **server.tomcat.connection-timeout** : 연결을 수락한 후 요청 URI 줄이 제시될 때까지 얼마 동안 기다릴지를 밀리초 단위로 정한다. -1을 사용하면 시간 제한이 없다는 의미다. 기본값은 60초이다.   
- **server.tomcat.keep-alive-timeout** : 다른 HTTP 요청을 기다리기 전에 연결을 닫을 때까지 얼마 동안 기다릴지를 밀리초 단위로 정한다. 기본값은 connectionTimeout 속성에 설정된 값을 사용한다. -1 값을 사용하면 시간 제한이 없다는 의미다.

Tomcat에서는 별도의 Read/Write Timeout 속성은 제공하지 않고 connection-timeout 속성을 제공한다.
Acceptor 스레드에서 클라이언트 연결이 이루어지면 해당 소켓의 Read/Write Timeout을  connection-timeout으로 설정하고 Poller 에 등록된다.

```JAVA
socketWrapper.setReadTimeout(getConnectionTimeout());
socketWrapper.setWriteTimeout(getConnectionTimeout());
```

그 후, Poller는 이벤트 루프를 돌면서 해당 소켓이 타임아웃이 발생하였는지 검사한다.
아래는 Poller의 이벤트 루프 로직을 단순화 한 것 이다.

```JAVA
public void run() {
    
    while (true) {

        boolean hasEvents = events();

        keyCount = selector.selectNow();
				
        Iterator<SelectionKey> iterator =
            keyCount > 0 ? selector.selectedKeys().iterator() : null;

        while (iterator != null && iterator.hasNext()) {
		  processKey(sk, socketWrapper);
        }
				
        timeout(keyCount,hasEvents); // Process timeouts
    }

}
```

`processKey(sk, socketWrapper)` 에서 준비된 소켓의 처리가 이루어지고 `timeout(keyCount,hasEvents)` 에서 타임아웃 관련 처리가 이루어진다.   


### timeout(keyCount,hasEvents)

```JAVA
protected void timeout(int keyCount, boolean hasEvents);
```
timeout 메서드는 현재 selector에 등록된 모든 키의 수인 keyCount와 등록된 채널에서 관심 있는 이벤트가 발생했는 지 여부인 hasEvents 를 인수로 받는다.


#### 조건 검사
timeout 메서드가 실행되면 첫 번째로 아래의 조건을 검사한다.

```JAVA
if (nextExpiration > 0 && (keyCount > 0 || hasEvents) && (now < nextExpiration) && !close) {
	return;
}
```

- `nextExpiration > 0 && (now < nextExpiration)` : 현재 시간이 nextExpiration까지 아직 경과하지 않았다면
- `(keyCount > 0 || hasEvents)` : polling 큐나 selector에 이벤트가 대기 중이라면
- `!close` : 서버 소켓이 아직 닫히지 않았다면

여기서 nextExpiration은 `System.currentTimeMillis() + socketProperties.getTimeoutInterval()`로 계산된다.

조건의 핵심은 계산된 nextExpiration과 현재 시간을 비교해서 타임아웃 로직을 계속할지 결정하는 것이다.

`socketProperties.getTimeoutInterval()`의 기본 값은 1초로, 이 때문에 무한루프 내에서 1초마다 타임아웃을 검사하게 된다.
이런 방식은 busy wait로 동작하는데, 짧은 간격으로 계속 실행되기 때문에 스레드 컨텍스트 스위칭 같은 작업 스케줄링 오버헤드를 줄여 성능을 향상시키려는 의도로 보인다.


#### 연결되어 있는 모든 소켓 확인
Selector에 등록된 모든 SelectionKey를 가져와 연결되어 있는 모든 소켓에 대해서 타임아웃 검사를 한다.
```JAVA
for (SelectionKey key : selector.keys()) {
    keycount++;
    NioSocketWrapper socketWrapper = (NioSocketWrapper) key.attachment();
    
    // 생략...
}
```
```JAVA
// 소켓이 현재 read 작업에 관심이 있다면 readTimeout 판단
if (socketWrapper.interestOpsHas(SelectionKey.OP_READ)) {
    long delta = now - socketWrapper.getLastRead();
    long timeout = socketWrapper.getReadTimeout();
    if (timeout > 0 && delta > timeout) {
        readTimeout = true;
    }
}
```
```JAVA
// 소켓이 현재 write 작업에 관심이 있다면 writeTimeout 판단
if (!readTimeout && socketWrapper.interestOpsHas(SelectionKey.OP_WRITE)) {
    long delta = now - socketWrapper.getLastWrite();
    long timeout = socketWrapper.getWriteTimeout();
    if (timeout > 0 && delta > timeout) {
        writeTimeout = true;
    }
}
```
Selector로 관리하는 각 연결의 정보는 SelectionKey에 담겨있다. 이 SelectionKey에서 socketWrapper를 가져와 연결 상태를 파악하고 조절한다.

socketWrapper로 해당 소켓이 마지막으로 언제 데이터를 읽었는지 (getLastRead)와 썼는지 (getLastWrite) 확인한다.
현재 시간과 마지막으로 데이터를 읽거나 쓴 시간 사이의 차이를 delta로 계산한다.
이 delta가 설정된 timeout을 넘으면, 그 연결은 타임아웃으로 간주하고 관련 작업을 수행한다.


#### 타임아웃 처리
위에서 설정된 writeTimeout, readTimeout 변수를 확인하여 타임아웃이라고 판단되면 cancelledKey 메서드를 호출한다.
cancelledKey 메서드는 할당되어 있는 자원을 해제하고 소켓 연결을 종료한다.
```JAVA
 if (readTimeout && socketWrapper.readOperation != null) {
    if (!socketWrapper.readOperation.process()) {
        cancelledKey(key, socketWrapper);
    }
} else if (writeTimeout && socketWrapper.writeOperation != null) {
    if (!socketWrapper.writeOperation.process()) {
        cancelledKey(key, socketWrapper);
    }
} else if (!processSocket(socketWrapper, SocketEvent.ERROR, true)) {
    cancelledKey(key, socketWrapper);
}
```

- `socketWrapper.readOperation.process()` 및 `socketWrapper.writeOperation.process()`      
socketWrapper의 readOperation, writeOperation 는 비동기 처리일 때 사용된다.
timeout이 발생했을 때 등록된 비동기 작업이 있으면 process() 를 통해 해당 작업을 처리한다.      
만약 비동기 작업 처리에 실패한다면`(!socketWrapper.readOperation.process() == true) 인 경우` cancelledKey 을 호출하여 socket을 close 한다.

- `processSocket(socketWrapper, SocketEvent.ERROR, true)`   
동기 HTTP 요청 처리을 처리할 때 선택되는 로직이다. processSocket 메서드에 SocketEvent.ERROR라는 Enum 타입을 전달하면 해당 메서드 내에서 SocketEvent의 값에 따라 처리 로직이 분기된다. 
processSocket은 Worker threadPool에서 스레드 하나를 할당받아 소켓 이벤트를 처리하게 된다.
즉, 워커 스레드를 하나 할당받아 socket close 작업을 진행한다.   
만약 Worker Pool에서 스레드 할당에 실패하면 `(!processSocket(socketWrapper, SocketEvent.ERROR, true) == true)` 현재의 Main Thread(Poller Thread)에서 cancelledKey를 호출하여 socket을 close 한다.



## Persistent Connection
HTTP 프로토콜은 기본적으로 비연결성(connectionless)를 기반으로 한다. 이는 매 요청마다 3-way-handshake를 맺어야 하는 오버헤드가 발생한다.
그래서 HTTP/1.1 부터는 매 요청마다 새로운 연결을 맺는 것이 아니라 기존 연결을 재사용할 수 있는 keep-alive 메커니즘을 제공한다.

그렇다면 tomcat에서는 어떻게 Persistent Connection을 관리할까? 기본적으로 Tomcat 8.0 이후부터는 java.nio의 Selector를 이용하여 소켓을 관리한다.
Selector를 사용하여 싱글 스레드로도 대량의 Connection들을 관리할 수 있다. 여기서는 Tomcat의 코드 레벨에서 Persistent Connection (Keep-Alive Connection) 과 Non-Persistent Connection (Close Connection) 처리의 차이를 분석해보려고 한다.

Tomcat의 Http11Processor는 HTTP 프로토콜의 핵심 부분을 구현하는데, Keep-alive 처리 역시 여기서 이루어진다.
Http11Processor의 `service()` 메서드는 소켓을 통해 들어오는 HTTP 요청을 처리한다. 요청 헤더를 파싱하고 서블릿으로 요청을 위임하고 요청 상태에 따라 소켓 상태를 결정하여 반환한다.

```JAVA
public SocketState service(SocketWrapperBase<?> socketWrapper) throws IOException;
```

```java
enum SocketState {
    OPEN, CLOSED, LONG, ASYNC_END, SENDFILE, UPGRADING, UPGRADED, ASYNC_IO, SUSPENDED
}
```

```
SocketState service(socketWrapper) {
    요청 정보 및 플래그 초기화

    while (다양한 조건들)
        요청 헤더 파싱 시도
        프로토콜 준비
        서비스 일시 중지 확인
        요청 헤더 파싱
        업그레이드 요청 확인
        요청 준비 및 처리
        요청 종료 처리
        요청 카운터 업데이트
        sendfile 상태 처리

   return 소켓 상태 결정 및 반환
}
```

### Non-Persistent Connection 처리
HTTP 요청이 Non-persistent 인 경우 service 메서드는 SocketState.CLOSED 를 반환하게 된다.
워커 스레드는 이 소켓 처리 결과가 SocketState.CLOSED일 경우, 소켓 연결을 종료하고 관련 자원을 해제한다. 아래 코드는 이러한 작업을 수행하는 부분이다.

```JAVA
if (handshake == 0){
    SocketState state=SocketState.OPEN;
    // Process the request from this socket
    if(event==null){
      state = getHandler().process(socketWrapper,SocketEvent.OPEN_READ);
    }else{
      state = getHandler().process(socketWrapper,event);
    }
    if(state==SocketState.CLOSED){
      poller.cancelledKey(getSelectionKey(),socketWrapper);
    }
}
```
여기서 `getHandler().process()`는 Http11Processor의 process 메서드를 호출하는 부분이다.
코드 마지막의 if문에서 process 메서드의 반환값이 SocketState.CLOSED일 때, `poller.cancelledKey()`를 호출해 연결을 종료하는 것을 확인할 수 있다.
   

HTTP 요청이 Non-persistent 인지 판단하는 조건은 여러 가지 있는데 Non-persistent에 해당하는 조건이면 keepAlive 변수를 false로 변경하고 service() 메서드의 반환값으로 SocketState.CLOSED 를 리턴한다. 판단 조건은 대표적으로 아래와 같은 것들이 있다.

#### HTTP/1.0 으로 호출하는 경우
```JAVA
if (protocolMB.equals(Constants.HTTP_10)) {
    http09 = false;
    http11 = false;
    keepAlive = false;
}   
```

#### keep-alive 최대 요청이 1이거나 최대 요청을 초과한 경우
```JAVA
int maxKeepAliveRequests = protocol.getMaxKeepAliveRequests();
if (maxKeepAliveRequests == 1) { // keep-alive max=1 인 경우
    keepAlive = false;
} else if (maxKeepAliveRequests > 0 && socketWrapper.decrementKeepAlive() <= 0) { // keep-alive max값 보다 요청을 더 많이 한 경우
    keepAlive = false;
}

```

#### HTTP 응답 상태코드가 200 범위가 아닌 경우
```JAVA    
private void checkExpectationAndResponseStatus() {
    if (request.hasExpectation() && !isRequestBodyFullyRead() &&
            (response.getStatus() < 200 || response.getStatus() > 299)) {
        // Client sent Expect: 100-continue but received a
        // non-2xx final response. Disable keep-alive (if enabled)
        // to ensure that the connection is closed. Some clients may
        // still send the body, some may send the next request.
        // No way to differentiate, so close the connection to
        // force the client to send the next request.
        inputBuffer.setSwallowInput(false);
        keepAlive = false;
    }
}
```

#### 요청 헤더에 Connection: close 로 명시한 경우
```JAVA
MimeHeaders headers = request.getMimeHeaders();

// Check connection header
MessageBytes connectionValueMB = headers.getValue(Constants.CONNECTION);
if (connectionValueMB != null && !connectionValueMB.isNull()) {
    Set<String> tokens = new HashSet<>();
    TokenList.parseTokenList(headers.values(Constants.CONNECTION), tokens);
    if (tokens.contains(Constants.CLOSE)) {
        keepAlive = false;
    } else if (tokens.contains(Constants.KEEP_ALIVE_HEADER_VALUE_TOKEN)) {
        keepAlive = true;
    }
}
```

### Persistent Connection 처리
Persistent Connection이 유지되는 조건은 위의 Non-Persistent 요청이 아니라면 Keep-Alive 가 동작하여 소켓 연결을 계속 유지한다.
이는 HTTP 헤더에 `Connection: Keep-alive` 를 명시하지 않아도 기본값으로 Keep-alive가 동작된다는 얘기이다.
대신 response 헤더에 `Connection: Keep-alive` 와 `Keep-Alive: timeout=60, max=1000`와 같은 헤더가 나오지 않으니 클라이언트를 위해 명시적으로 요청하는것이 좋다.

Persistent Connection 은 `server.tomcat.keep-alive-timeout` 속성을 통해 이루어진다.
만약 keep-alive-timeout 동안 어떤 read/write 활동도 없다면 해당 연결은 종료된다.

그럼 keep-alive-timeout은 어떻게 처리될까?
Tomcat은 클라이언트와 처음 연결한 후, Read Timeout을 기준으로 타임아웃 여부를 판단한다.
Read Timeout 내에 클라이언트로부터 데이터가 도착하면 요청을 정상적으로 처리하고 응답한다.
만약 이 요청이 Persistent Connection 요청이라면, Read Timeout 값을 keep-alive-timeout으로 바꾼다.
그리고 나서는 이전에 설명한 Read/Write 타임아웃 관리 방식으로 연결을 계속 유지하고 관리한다.

만약 클라이언트의 요청이 keep-alive-timeout 내에 계속 들어온다면, 해당 연결의 타임아웃은 계속해서 초기화되어 연결이 지속된다.
이는 타임아웃이 현재 시간과 소켓에서 마지막으로 Read/Write한 시간을 기준으로 계산되기 때문이다.

서버에서 연결을 유지하려고 해도 클라이언트도 해당 연결을 유지해야 keep-alive가 제대로 작동한다.
예를 들어, curl을 사용하여 keep-alive로 요청을 보내도 curl 프로그램이 종료될 때 클라이언트에서 소켓을 먼저 닫아버리기 때문에 Persistent Connection은 유지되지 않는다.

그리고 keep-alive의 주요 목적은 이미 맺어진 연결을 재사용하는 것이다.
따라서 클라이언트가 새로운 소켓을 통해 요청을 보내면, 서버와는 새로운 연결이 형성된다. 이 경우, 다른 소켓에서 유지되는 Persistent Connection과는 별개로 동작하므로 재사용할 수 없다.


## 정리
Tomcat에서는 연결들을 타임아웃의 관점에서 어떻게 관리하는지, 특히 Read/Write Timeout과 Persistent Connection에 초점을 맞춰 살펴보았다.
이 과정에서 busy wait 방식을 사용하여 지속적으로 타임아웃을 검사하는 것을 확인했다.
더불어, Tomcat에서는 `read-timeout` 또는 `write-timeout` 없이 `connection-timeout` 이라는 명칭으로 타임아웃 값을 설정하는데,
이는 Persistent Connection의 경우 `keep-alive-timeout`으로 변경되기 때문에 `connection-timeout` 명칭을 쓰지 않았나 싶다.