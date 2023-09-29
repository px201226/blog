---
layout: post
title: "Java의 Socket Option 정리"
tags:
  - Java
lang: ko-KR
date: 2023-09-29
update: 2023-09-29
---

## Socket Option
소켓 옵션은 자바의 Socket 클래스가 사용하는 네트워크 소켓이 데이터를 어떻게 보내고 받을 것인지를 결정한다. 자바에서는 클라이언트 측 소켓에 대해 9가지 옵션이 존재한다.
- TCP_NODELAY
- SO_BINDADDR
- SO_TIMEOUT
- SO_LINGER
- SO_SNDBUF
- SO_RCVBUF
- SO_KEEPALIVE
- OOBINLINE
- IP_TOS

java.net.SocketOptions 인터페이스에 각 옵션이 정의되어 있고 socket 클래스의 메서드를 통해 옵션을 설정할 수 있다. 여기서는 주요 옵션들에 기능에 대해 정리한다.


## TCP_NODELAY

```JAVA
public void setTcpNoDelay(boolean on) throws SocketException
public boolean getTcpNoDelay() throws SocketException
```

TCP는 기본적으로 Nagle’s 알고리즘을 사용하여 작은 패킷들을 합쳐서 하나의 큰 패킷으로 전송한다. 이렇게 하는 이유는 작은 패킷들을 하나씩 보내는 것보다, 여러 패킷을 하나의 큰 패킷으로 합쳐서 보내면 전송 효율이 높아지기 때문이다. Nagle’s 알고리즘은 데이터를 효율적으로 전송하기 좋은 방법이지만, 특정 상황에서는 좋은 방법이 아닐 수 있다. 예를 들면 실시간 빠른 응답이 필요한 애플리케이션(게임, GUI 프로그램 등)에서는 패킷이 지연 없이 바로 전송되어야 한다. TCP_NODELAY를 true로 설정하면, Nagle’s 알고리즘이 비활성화되어 작은 패킷도 즉시 전송된다.
즉, 패킷을 버퍼링하지 않고 즉시 전송하는 것을 의미한다.



## SO_LINGER

```JAVA
public void setSoLinger(boolean on, int seconds) throws SocketException
public int getSoLinger() throws SocketException

```
SO_LINGER 옵션은 소켓을 닫을 때 아직 전송되지 않은 패킷을 어떻게 처리될지를 결정한다.
큰 파일을 다른 컴퓨터에게 전송하고 있는 상태에서 파일 전송이 완전히 끝나기 전에 close() 메서드를 호출하면 어떻게 될까? 기본적으로 close() 메서드를 호출하면 연결을 종료하려고 시도하고, 아직 전송되지 않은 데이터가 있다면 그 데이터를 원격지에 전송하려고 한다. 이렇게 하는 이유는 연결을 종료하기 전에 전송되지 않은 데이터를 안전하게 전송하기 위해서이다. 따라서, close() 메서드가 즉시 반환되었다고 시스템 내부 작업이 완전히 끝났다고 판단할 수는 없다. 이 옵션은 소켓을 close 할 때 처리를 세밀하게 조정할 수 있다.

- 비활성화된 경우 (-1): 소켓은 바로 닫히며 아직 전송되지 않은 데이터가 있다면 시스템은 그 데이터를 전송하려고 한다. 이 때 얼마나 오랜 시간 동안 노력할지는 시스템의 기본 설정에 따라 다르다.
- 활성화된 경우 (0 이상의 값): 설정된 시간(초) 동안 아직 전송되지 않은 데이터를 전송하려고 노력하고, 그 시간이 지나면 남은 데이터를 전송하지 않고 소켓을 close한다.
- 0인 경우: 아직 전송되지 않은 모든 데이터는 버려지고 즉시 소켓이 close된다.

```JAVA
socket.setSoLinger(false, -1); // SO_LINGER 옵션 비활성화
socket.setSoLinger(true, 300); // close() 후, 5분 동안 추가 데이터 전송을 허용
```

getSoLinger() 메서드는 SO_LINGER 옵션이 비활성화되어 있다면 -1을 반환하고, 그게 아니라면 현재 소켓의 "linger" 시간 즉, 닫히기 전에 남은 데이터를 전송하는 데 허용된 시간을 초 단위로 반환한다.


## SO_TIMEOUT

```JAVA
public void setSoTimeout(int milliseconds) throws SocketException
public int getSoTimeout() throws SocketException
```
SO_TIMEOUT 옵션은 너무 오랫동안 데이터를 기다리지 않도록 할 수 있다. sockect.read() 메서드는 소켓에서 데이터를 읽을 때까지 블록킹된다. SO_TIMEOUT 설정을 사용하면 read() 메서드가 무한정으로 블록킹 되지 않도록 타임아웃을 설정할 수 있다. 0 으로 설정할 경우 타임아웃이 없음을 의미하고 기본값으로 사용된다.
예를 들어, 1분의 read timeout을 설정하고 싶다면 socket.setSoTimeout(60000); 로 설정할 수 있다.


## SO_RCVBUF, SO_SNDBUF

```JAVA
public void setReceiveBufferSize(int size) throws SocketException, IllegalArgumentException
public int getReceiveBufferSize() throws SocketException
public void setSendBufferSize(int size) throws SocketException, IllegalArgumentException
public int getSendBufferSize() throws SocketException
```

SO_RCVBUF는 네트워크 입력을 위한 버퍼 크기를, SO_SNDBUF는 네트워크 출력을 위한 버퍼 크기를 제어한다.
파일 전송과 같은 상황에서는 큰 버퍼가 이점이 있지만, 게임과 같은 실시간 통신이 필요한 상황의 경우에는 버퍼를 사용할 경우 전송 지연이 발생할 수 있다. 운영체제 마다 다르지만 일반적으로 128바이트가 일반적인 기본값이다.
버퍼 크기는 소켓의 최대 속도를 결정하는데, 최대 가능한 대역폭은 버퍼 크기를 지연시간으로 나눈 값이다.
예를 들어, 두 호스트 간의 전송 지연시간이 0.5초에 버퍼 크기가 128바이트라면 128byte/0.5s = 256byte/1s가 된다. 지연시간은 애플리케이션이 제어할 수 없는 변수이므로 버퍼 사이즈를 두 배로 늘리면 대역폭도 두 배로 증가한다.
물론 네트워크가 처리할 수 있는 대역폭은 제한되어 있기 때문에 그 보다 작게 설정해야 한다.

java doc을 확인해보면 setReceiveBufferSize, setSendBufferSize 는 네트워크 I/O 버퍼를 설정하기 위한 크기에 대한 힌트로 사용된다.
> Sets the SO_SNDBUF option to the specified value for this Socket. The SO_SNDBUF option is used by the platform's networking code as a hint for the size to set the underlying network I/O buffers.

이는 set으로 설정하더라도 실제 구현에서는 값이 달라질 수 있다는 얘기이다. 실제 버퍼가 어떤 크기로 설정되어 있는지 확인하기 위해 getSendBufferSize() 메서드로 확인할 수 있다.


## SO_KEEPALIVE

```JAVA
public void setKeepAlive(boolean on) throws SocketException 
public boolean getKeepAlive() throws SocketException
```

SO_KEEPALIVE는 HTTP 프로토콜에 Keepalive 헤더와는 다른 옵션이다. SO_KEEPALIVE 옵션은 서버가 죽어있는지 헬스 체크를 확인하기 위해 주기적으로 패킷을 보내는 옵션이다. 서버가 이 패킷에 응답하지 않으면 클라이언트는 응답을 받을 때 까지 시도하다가 결국 응답을 받지 못하면 소켓을 close한다. 네트워크 연결이 적절히 종료되지 않고 클라이언트나 서버 중 한 쪽에서만 종료된 경우를 half open 연결이라고 하는데, SO_KEEPALIVE는 그 상태를 감지하기 위한 기능이다.

TCP Keepalive의 상세 설정은 운영체제 파라미터를 통해 설정할 수 있다.
아래는 Linux에서 keepalive 관련 설정값들이다.
- /proc/sys/net/ipv4/tcp_keepalive_time   
  이 파일에 저장된 값은 TCP keep-alive 패킷이 처음으로 전송되기 시작하는 시간을 초 단위로 나타낸다.
  일반적으로 기본값은 7200초(2시간)이다. 즉, 연결이 비활성 상태로 있을 때 2시간 후에 첫 번째 keep-alive 패킷이 전송된다.

- /proc/sys/net/ipv4/tcp_keepalive_intvl   
  이 파일에 저장된 값은 keep-alive 패킷 간의 간격을 초 단위로 나타낸다.
  예를 들어, 첫 번째 keep-alive 패킷에 대한 응답이 없으면 이 파일에 지정된 간격 후에 두 번째 패킷이 전송된다.
  일반적으로 기본값은 75초이다.

- /proc/sys/net/ipv4/tcp_keepalive_probes    
  이 파일에 저장된 값은 연속적으로 전송될 수 있는 keep-alive 패킷의 최대 횟수를 나타낸다.
  일반적으로 기본값은 9이다. 즉, keep-alive 패킷 9회 연속으로 응답이 없을 경우 연결이 끊어진다.


## OOBINLINE

```JAVA
public void sendUrgentData(int data) throws IOException
public void setOOBInline(boolean on) throws SocketException 
public boolean getOOBInline() throws SocketException
````

TCP에는 긴급 데이터(Urgent Data)를 바로 전송하는 기능이 있다. sendUrgentData() 메서드를 사용하면 int data를 거의 바로 전송한다. 전송될 바이트는 data 파라미터의 최하위 8비트가 전송된다. OutputStream에 이미 데이터가 기록되어 있다면 이미 기록되어 있는 데이터 뒤에 전송된다.

OOBINLINE 값이 true이면 소켓의 입력 스트림에 위치하게 되어 일반적인 방법으로 읽을 수 있다. 기본값은 false이다. Java에서는 긴급 데이터는 일반 데이터와 구별하지 않기 때문에 긴급 바이트를 처리하기가 어려운데, Ctrl-C 같은 특별한 의미를 갖는 바이트를 전송이 필요할 때 써볼 수 있다.


## SO_REUSEADDR

```JAVA
public void setReuseAddress(boolean on) throws SocketException 
public boolean getReuseAddress() throws SocketException
```

SO_REUSEADDR 옵션은 소켓을 닫았을 때 해당 소켓의 포트를 즉시 다시 사용할 수 있게 해주는 역할은 한다.
소켓 연결을 끊게 되면 먼저 연결을 끊는 쪽에서 TIME_WAIT 상태로 일정시간 유지되는데, 이는 네트워크 상에 아직 도착하지 않은 마지막 패킷들이 소켓에 도착할 시간을 확보하기 위한 것이다. 따라서, 소켓 연결이 끊어진다고 해서 그 포트가 즉시 재사용되지 않는다. 시스템은 이러한 늦게 도착한 패킷들을 처리하지 않지만, 그 패킷들이 같은 포트를 사용하는 다른 프로세스에게 잘못 전달되는 것을 방지하기 위해 일정시간을 대기한다.
SO_REUSEADDR 옵션을 활성화하면, 이러한 대기 시간 없이 포트를 즉시 재사용할 수 있게 한다.

TIME_WAIT 상태에 자세한 설명은 [카카오 기술블로그](https://tech.kakao.com/2016/04/21/closewait-timewait/)에 잘 정리된 것이 있으니 참고하길 바란다.

setReuseAddress() 메서드가 작동하려면 소켓이 포트에 바인됭되기 전에 setReuseAddress() 호출해야 한다.
즉 인자없는 생성자 new Socket() 을 통해 소켓을 생성한다음 setReuseAddress(true)를 호출하고 connect() 메서더를 통해 소켓을 연결해야 한다.


## 참조
- TCP/IP Illustrated
- 자바 네트워크 프로그래밍 4판

