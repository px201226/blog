---
layout: post
title: "요청이 급증하는 상황의 Connection reset by peer 트러블 슈팅"
tags:
  - kernel
lang: ko-KR
date: 2023-10-30
update: 2023-10-30
---

## 문제 상황

소켓을 활용하여 서버-클라이언트 간 통신을 진행하는 과정에서, 클라이언트로부터의 요청이 일시적으로 급증하는 상황을 테스트하던 중,
클라이언트 측에서 `Connection reset by peer` 라는 예외가 간헐적으로 발생하였다. 아래는 해당 예외가 발생했을 때 클라이언트 측에서 기록된 로그이다.

```
Hello, world!
Hello, world!
Hello, world!
org.springframework.web.client.ResourceAccessException: I/O error: Connection reset by peer; nested exception is java.net.SocketException: Connection reset by peer
	at org.springframework.web.client.RestTemplate.doExecute(RestTemplate.java:453)
	at org.springframework.web.client.RestTemplate.execute(RestTemplate.java:401)
	at org.springframework.web.client.RestTemplate.getForObject(RestTemplate.java:199)
	at com.example.ehcache.EhcacheApplication2.lambda$main$0(EhcacheApplication2.java:35)
	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:635)
	at java.base/java.lang.Thread.run(Thread.java:833)
Caused by: java.net.SocketException: Connection reset by peer
	at java.base/sun.nio.ch.Net.connect0(Native Method)
	at java.base/sun.nio.ch.Net.connect(Net.java:579)
	at java.base/sun.nio.ch.Net.connect(Net.java:568)
```

`Hello, world!`는 클라이언트가 서버로부터 정상적으로 응답을 받아 출력한 메시지이다.
그 아래에 나타나는 `java.net.SocketException: Connection reset by peer` 예외는 RestTemplate을 통한 소켓 통신 중 발생했다는 것을 확인할 수 있다.

해당 문제가 발생한 서버-클라이언트 코드는 아래와 같다.
여기서 서버는 스레드풀 기반의 간단한 HTTP 서버를 구현하였고, 클라이언트는 이 서버에 스레드 1000개를 사용하여 동시에 요청을 보내는 구조를 가지고 있다.

#### Server

```JAVA
public class ServerExampleApplication {

	private static final int PORT = 8100;
	private static final int NUM_THREADS = 10;

	public static void main(String[] args) {

		ExecutorService executorService = Executors.newFixedThreadPool(NUM_THREADS);

		try (ServerSocket serverSocket = new ServerSocket(PORT)) {

			while (true) {
				Socket socket = serverSocket.accept();
				executorService.submit(new ClientHandler(socket));
			}

		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public static class ClientHandler implements Runnable {

		private Socket socket;

		public ClientHandler(Socket socket) {
			this.socket = socket;
		}

		@Override
		public void run() {
			try {
				BufferedReader input = new BufferedReader(new InputStreamReader(socket.getInputStream()));
				input.readLine();

				PrintWriter writer = new PrintWriter(socket.getOutputStream(), true);
				writer.println("HTTP/1.1 200 OK");
				writer.println("Content-Type: text/plain");
				writer.println("Connection: close");
				writer.println();
				writer.println("Hello, world!");

				writer.close();
				input.close();

			} catch (Exception e) {
				e.printStackTrace();
			}

		}
	}

}
```

#### Client

```JAVA
public class Client {

	private static final String URL = "http://localhost:8100";
	private static final int NUM_THREADS = 1000;

	public static void main(String[] args) throws InterruptedException {

		ExecutorService es = Executors.newFixedThreadPool(NUM_THREADS);
		RestTemplate restTemplate = new RestTemplate();

		for (int i = 0; i < NUM_THREADS; i++) {
			es.execute(() ->
					{
						try {
							var response = restTemplate.getForObject(URL, String.class);
							System.out.println(response);
						} catch (Exception e) {
							e.printStackTrace();
						}
					}
			);
		}

		es.shutdown();
		es.awaitTermination(100, TimeUnit.SECONDS);
	}

}
```

> 시스템 환경에 따라 예외 재현이 안될 수 있다.

요청량이 많아 서버의 리소스가 부족해져 요청을 제대로 처리하지 못하는 상황이 이해는 가지만, 시스템이 요청을 처리할지 여부를 결정하는 기준이 무엇인지에 대해 궁금증이 생겼다.

이번 글에서는 요청이 폭증하는 상황에서 발생하는 `Connection reset by peer` 예외의 원인을 깊이 있게 분석한다.

## 원인 분석 과정

### 패킷 분석

클라이언트 쪽에서 `Connection reset by peer` 예외가 발생했지만, 서버 애플리케이션 단에서는 어떤 예외도 잡아낼 수 없었다.
상황을 더 자세히 파악하기 위해 Wireshark를 사용해 패킷을 분석하였다.
아래 **그림 1**은 문제가 발생한 시점의 서버-클라이언트 소켓 통신 패킷 캡쳐 화면이다.
![[그림1]문제가 발생한 서버-클라이언트 소켓 통신](img.png)

- 3842번 패킷 : 클라이언트 -> 서버로 `SYN` 패킷을 전송하였다.
- 3843번 패킷 : 서버 -> 클라이언트로 `SYN,ACK` 으로 응답하였다.
- 3845번 패킷 : 클라이언트 -> 서버로 `ACK`로 응답 후, 3-way Handshake가 완료되었다.
- 3848번 패킷 : 서버 -> 클라이언트로 `RST` 패킷을 전송한다.

캡쳐된 패킷을 살펴보면 정상적인 TCP 3-way Handshake가 진행된 후, 서버에서 RST 패킷을 전송하여 연결을 강제로 종료하였다.
RST 패킷은 연결의 문제나 예외적인 상황에서 전송되므로 해당 연결에 문제가 발생했음을 알 수 있다.

문제 상황에서 클라이언트가 출력한 스택 트레이스를 살펴보면, socket.connect() 를 수행 중 예외가 발생한 것을 확인할 수 있다.
즉, 클라이언트 소켓이 connect()를 호출해 수행하던 중 3-way Handshake를 완료한 후에 서버로부터 RST 패킷을 받아 `Connection reset by peer` 예외가 발생된 것으로 확인된다.

### 테스트 환경 전환

애플리케이션 로그와 패킷 분석 결과, 예외가 애플리케이션 레벨보다는 OS나 TCP/IP 프로토콜 레벨에서 발생한 것 추측되었다.
패킷 분석에서 서버가 RST 패킷을 전송한 걸 확인했는데, 애플리케이션에는 `RST` 패킷을 전송하는 로직이나 패킷을 보낼 조건을 결정하는 로직이 없기 때문이다.

원인을 보다 구체적으로 파악하기 위해 MacOS 환경 대신 리눅스 환경에서 동일한 서버-클라이언트 코드로 테스트를 해보기로 결정했다.
Docker를 사용해 리눅스 환경을 구성하고 테스트를 진행했다. 여기서는 ubuntu 리눅스를 선택했다.

```shell
docker run -it -v ~/docker/linux:/home ubuntu
```

동일한 서버-클라이언트 코드를 사용해 테스트 했을 때, 같은 스레드와 부하에도 불구하고 리눅스 환경에서는 `Connection reset by peer` 예외가 한 번도 발생하지 않았다.
여러번 테스트해도 결과는 같았고 심지어 클라이언트 부하를 증가시켜도 예외가 발생하지 않았다.
이 결과로 볼 때, 서버가 클라이언트에게 `RST` 패킷을 전송하는 결정 및 과정이 OS나 TCP/IP 프로토콜 레벨에서 이루어지고 있을 가능성이 매우 높아졌다.

### 소켓 내부 로직 분석

리눅스 환경에서 예외가 재현되지 않는 것을 확인 후, Socket 클래스 내부 동작을 살펴보았다.
Socket 클래스의 연산은 결국 PlainSocketImpl 클래스의 native 메서드를 호출하는 것을 확인할 수 있었다.
이러한 네이티브 메서드는 OS의 시스템 호출을 통해 소켓 작업을 처리한다. 따라서, 시스템 레벨에서 소켓이 어떻게 동작되는지 확인이 필요하다.

```JAVA
class PlainSocketImpl extends AbstractPlainSocketImpl {
	// [...]

	native void socketCreate(boolean stream, boolean isServer) throws IOException;

	native void socketConnect(InetAddress address, int port, int timeout)
			throws IOException;

	native void socketBind(InetAddress address, int port)
			throws IOException;

	native void socketListen(int count) throws IOException;

	native void socketAccept(SocketImpl s) throws IOException;

	native int socketAvailable() throws IOException;

	native void socketClose0(boolean useDeferredClose) throws IOException;

	native void socketShutdown(int howto) throws IOException;

	static native void initProto();

	native void socketSetOption0(int cmd, boolean on, Object value)
			throws SocketException;

	native int socketGetOption(int opt, Object iaContainerObj) throws SocketException;

	native void socketSendUrgentData(int data) throws IOException;
}

```

## 소켓 통신 내부 구조

RST 패킷의 원인을 파악하기 위해, 소켓 통신의 내부 구조를 살펴보자.
먼저, 서버에서 클라이언트의 요청을 수락하는 accept 시스템 호출에 대한 설명을 man 명령어로 확인하면 다음과 같다.[^id1]

```shell
$ man accept
```

```
accept() extracts the first connection request on the queue
of pending connections, creates a new socket with the same properties of
socket, and allocates a new file descriptor for the socket. If no
pending connections are present on the queue, and the socket is not
marked as non-blocking, accept() blocks the caller until a connection is present.
```

> accept() 함수는 대기 중인 연결 요청의 큐에서 첫 번째 연결 요청을 추출하여,
> 해당 소켓과 동일한 속성을 가진 새로운 소켓을 생성하고 그 소켓에 대한 새로운 파일 디스크립터를 할당한다.
> 큐에 대기 중인 연결이 없고 소켓이 non-blocking으로 설정되지 않은 경우, accept()는 연결이 있을 때까지 호출자를 차단한다.

man 에서 설명된 내용을 기반으로 소켓 내부적으로 연결 요청을 위한 대기열를 내부적으로 유지한 다는 것을 알 수 있다.
소켓 통신 과정 중, 내부에 대기열이 존재한다는 실마리를 통해 관련 자료를 참조하여 내용을 정리할 수 있었다.
참조한 자료는 맨 아래 더 읽을거리에 정리해두었다.

### SYN 큐와 accept 큐

리눅스 커널은 3-Way Handshake 과정 중 내부적으로 SYN 큐와 accept 큐를 유지한다.
아래 프로세스는 3-Way Handshake 과정 중 두 개의 큐가 어떻게 사용되는 지를 설명한다.

1. 클라이언트는 서버에 연결을 시작하려고 SYN 패킷을 보내고, 이후 `SYN_SENT` 상태로 들어간다.
2. 서버는 클라이언트의 SYN 요청을 받으면 `SYN_RECV` 상태로 변경된다. 이때, 커널은 이 연결 정보를 SYN 큐에 저장하고 클라이언트에게 SYN+ACK 패킷을 응답한다.
3. 클라이언트는 서버로부터 받은 SYN + ACK를 받고, ACK를 서버에게 응답하면서 `ESTABLISHED` 상태로 변경된다.
4. 서버는 클라이언트로부터의 ACK를 받으면, 커널은 연결 정보를 SYN 큐에서 제거하고 accept 큐에 추가한다. 그 후 서버는 `ESTABLISHED` 상태로 들어간다.
5. 서버 애플리케이션에서 accept 함수를 호출하면, 연결은 accept 큐에서 꺼내진다.

아래 **그림2**는 위 프로세스를 다이어그램으로 표현한 것 이다.
![[그림2] 소켓 통신 과정](img_1.png)

SYN 큐는 1번에서 클라이언트가 보내온 SYN 패킷[^id2]을 저장한다.
SYN + ACK 패킷으로 응답하고, 클라이언트로부터 ACK 응답이 오지 않을 경우 재시도하기 위해 클라이언트 요청을 일시적으로 저장하기 위한 용도이다.

애플리케이션에서 accept()를 호출하지 않아도 클라이언트로 ACK 까지 받게되면 서버와 클라이언트 모두 `ESTABLISHED` 상태이다.
accept 큐는 4번에서 클라이언트로부터의 ACK 응답을 일시적으로 저장해두고, accept()가 호출되면 이 대기열에서 제거되고 애플리케이션에 전달된다.

SYN 큐와 accept 큐의 크기를 결정하는 관련 커널 파리미터는 아래와 같다.[^id3]

```shell
sysctl net.ipv4.tcp_max_syn_backlog
sysctl net.core.somaxconn 
```

> tcp\_max\_syn_backlog :
> Maximal number of remembered connection requests, which have not
> received an acknowledgment from connecting client.
> The minimal value is 128 for low memory machines, and it will
> increase in proportion to the memory of machine.
> If server suffers from overload, try increasing this number.

> somaxconn :
> Limit of socket listen() backlog, known in userspace as SOMAXCONN.
> Defaults to 128. See also tcp\_max\_syn\_backlog for additional tuning
> for TCP sockets.

### listen()

listen 함수를 호출할 때, 두 번째 인수로 주어지는 backlog는 대기 중인 연결 요청의 최대 수를 정의한다.
accept 큐의 크기 결정에 있어서, somaxconn 커널 파라미터와 listen 함수의 backlog 인자 두 가지가 중요한 역할을 한다.

```c
int listen(int sockfd, int backlog);
```

accept 큐의 크기를 결정하는 방식은 공식 문서에 따르면 다음과 같이 설명되어 있다.[^id4]
> Now it specifies the queue length for completely
> established sockets waiting to be accepted, instead of the number
> of incomplete connection requests. The maximum length of the
> queue for incomplete sockets can be set using
> /proc/sys/net/ipv4/tcp\_max\_syn\_backlog. When syncookies are
> enabled there is no logical maximum length and this setting is
> ignored. See tcp(7) for more information.
> If the backlog argument is greater than the value in
> /proc/sys/net/core/somaxconn, then it is silently capped to that
> value. Since Linux 5.4, the default in this file is 4096; in
> earlier kernels, the default value is 128. Before Linux 2.4.25,
> this limit was a hard coded value, SOMAXCONN, with the value 128.

요약하면, backlog 값이 /proc/sys/net/core/somaxconn보다 크면, 자동으로 somaxconn 값으로 제한된다.
불완전한 연결의 최대 큐 길이는 /proc/sys/net/ipv4/tcp\_max\_syn\_backlog로 설정이 가능하며, Linux 2.2 이전에는 somaxconn 값이 불완전한 연결 요청의 수를 나타내었다고 한다.
즉, accept 큐의 크기는 **min(somaxconn, backlog)** 값으로 설정된다.

## 검증 및 테스트

리눅스 환경에서 커널 파라미터 설정을 테스트하기 위한 서버-클라이언트 코드를 아래와 같이 작성한다.

#### Server

ServerSocket 인스턴스를 생성하여 연결을 대기하는 상태로 유지하되, accept() 메서드를 호출하여 연결을 수락하지는 않는다.

```java
public class Server {

	private static final int PORT = 8100;

	public static void main(String[] args) {

		try (ServerSocket serverSocket = new ServerSocket(PORT)) {

			while (true) {
				Thread.sleep(1000L);
				System.out.println(LocalDateTime.now());
			}

		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}
```

#### Client

RestTemplate을 사용하여 서버에 NUM_THREADS 개수만큼의 요청을 1초 간격으로 전송한다.

```JAVA
public class Client {

	private static final String URL = "http://localhost:8100";
	private static final int NUM_THREADS = 10;

	public static void main(String[] args) throws InterruptedException {

		ExecutorService es = Executors.newFixedThreadPool(NUM_THREADS);
		RestTemplate restTemplate = new RestTemplate();

		for (int i = 0; i < NUM_THREADS; i++) {
			es.execute(() ->
					{
						try {
							var response = restTemplate.getForObject(URL, String.class);
							System.out.println(response);
						} catch (Exception e) {
							e.printStackTrace();
						}
					}
			);
			Thread.sleep(1000L);
		}

		es.shutdown();
		es.awaitTermination(100, TimeUnit.SECONDS);
	}

}
```

#### somaxconn=5, 요청 10개인 경우

somaxconn 파라미터를 5로 설정하여 서버를 시작하고 10개의 클라이언트 요청을 전송한다. 이후 netstat을 사용하여 소켓의 상태를 확인한다.

``` 
sudo sysctl -w kern.ipc.somaxconn=5
```

```
$ netstat -an | grep 8100
tcp        6      0 0.0.0.0:8888            0.0.0.0:*               LISTEN
tcp        0      1 127.0.0.1:57826         127.0.0.1:8888          SYN_SENT
tcp        0      0 127.0.0.1:57824         127.0.0.1:8888          ESTABLISHED
tcp        0      1 127.0.0.1:57832         127.0.0.1:8888          SYN_SENT
tcp      116      0 127.0.0.1:8888          127.0.0.1:57814         ESTABLISHED
tcp        0      1 127.0.0.1:57828         127.0.0.1:8888          SYN_SENT
tcp      116      0 127.0.0.1:8888          127.0.0.1:57818         ESTABLISHED
tcp      116      0 127.0.0.1:8888          127.0.0.1:57824         ESTABLISHED
tcp        0      0 127.0.0.1:57822         127.0.0.1:8888          ESTABLISHED
tcp        0      0 127.0.0.1:57820         127.0.0.1:8888          ESTABLISHED
tcp        0      1 127.0.0.1:57830         127.0.0.1:8888          SYN_SENT
tcp      116      0 127.0.0.1:8888          127.0.0.1:57820         ESTABLISHED
tcp      116      0 127.0.0.1:8888          127.0.0.1:57816         ESTABLISHED
tcp      116      0 127.0.0.1:8888          127.0.0.1:57822         ESTABLISHED
tcp        0      0 127.0.0.1:57818         127.0.0.1:8888          ESTABLISHED
tcp        0      0 127.0.0.1:57814         127.0.0.1:8888          ESTABLISHED
tcp        0      0 127.0.0.1:57816         127.0.0.1:8888          ESTABLISHED
```

netstat을 통해 확인했을 때, `ESTABLISHED` 상태인 소켓쌍이 총 6개 생성되었고, 나머지 4개의 요청이 `SYN_SENT` 상태로 남아있는 것을 볼 수 있다.
즉, `ESTABLISHED` 상태인 소켓이 somaxconn의 한계에 도달하면, 그 이후의 요청들은 클라이언트 측에서 `SYN_SENT` 상태로 대기하게 된다.
`SYN_SENT` 상태인 클라이언트 소켓은 SYN + ACK 응답을 받지 못하여, 일정 시간을 지나면 타임아웃 처리되어 드롭된다.
이 때, 클라이언트에서 `Caused by: java.net.ConnectException: Operation timed out` 예외를 받을 수 있다.

somaxconn을 5로 설정했지만 `ESTABLISHED` 상태 소켓이 6쌍인 이유는 accept 큐가 꽉 차 있는지 여부를 검사하는 로직에서 >= 조건 대신 > 조건을 사용하기 때문에 최대 backlog 값보다 1개를 더 받게된다.[^id5]
이는 커널 버전이나 운영체제 별로 다를 수 있으니 참고하길 바란다.

```c
static inline bool sk_acceptq_is_full(const struct sock *sk)
{
  return READ_ONCE(sk->sk_ack_backlog) > READ_ONCE(sk->sk_max_ack_backlog);
}
```

다음으로, 4개의 소켓이 `SYN_SENT` 상태인 것을 확인할 수 있다.
그런데 특이한 점은 SYN 큐가 가득 차 있지 않아도 해당 소켓들이 `SYN_RECV` 상태가 아닌 `SYN_SENT` 상태에 있다는 점이다.
이 상황은 클라이언트가 SYN 패킷을 보냈지만 서버에서 SYN + ACK 응답을 받지 못한 상황을 나타낸다.
accept 큐가 가득 찰 경우 SYN 큐에 요청이 순서대로 저장되어 `SYN_RECV` 상태를 예상했는데, 정확한 원인은 커널 소스에서 확인해볼 수 있었다.
아래는 커널 소스에 일부분이다.

listen() 이후 클라이언트 요청이 오면 아래 `tcp_conn_request`[^id6] 함수가 실행된다.

```c
int tcp_conn_request(struct request_sock_ops *rsk_ops,
		     const struct tcp_request_sock_ops *af_ops,
		     struct sock *sk, struct sk_buff *skb)
{
	if ((syncookies == 2 || inet_csk_reqsk_queue_is_full(sk)) && !isn) {
		want_cookie = tcp_syn_flood_action(sk, rsk_ops->slab_name);
		if (!want_cookie)
			goto drop;
	}

	if (sk_acceptq_is_full(sk)) {
		NET_INC_STATS(sock_net(sk), LINUX_MIB_LISTENOVERFLOWS);
		goto drop;
	}
	
	// ... 중략
}
```

이 소스에서 첫 번째 if문은 `inet_csk_reqsk_queue_is_full()` 함수를 통해 SYN 큐가 꽉 찼는지 확인한다.
만약 꽉 찼다면, 바로 드롭 처리가 되는 것을 볼 수 있다.
다음으로 `sk_acceptq_is_full()` 함수로 accept 큐가 꽉 찼는지 확인하고, 꽉 차 있을 경우에도 드롭 처리한다.
즉, SYN 큐는 꽉 차 있지 않아도 accept 큐가 꽉 차면 요청이 드롭된다는 것을 알 수 있다.

> SYN 큐는 내용이 복잡하고 방대하여 여기서 다루지는 않는다. SYN 큐에 관한 자세한 내용은 아래 첨부된 링크를 통해 참조할 수 있다.[^id7][^id8]

## Connection reset by peer

테스트를 통해 somaxconn 크기만큼 accept 큐 크기가 결정되는 것을 확인할 수 있었다.
accept 큐가 꽉 차더라도 `Connection reset by peer` 예외는 발생하지 않았다.
대신 큐가 꽉 찬 후로는 들어오는 요청이 `SYN_SENT` 상태에서 멈춰 타임아웃이 발생했다.

그렇다면 `Connection reset by peer` 예외는 언제 발생하는 것일까?
결론부터 말하면 SYN 큐에 accept 큐 사이즈를 초과하는 요청이 몰릴 경우, SYN 큐에서 accept 큐로 이동하는 과정에서 accept 큐의 오버플로가 발생하게 되면, 그 추가 요청에 대해서 `Connection reset by peer` 예외가 발생한다.

위의 테스트 로직에서 클라이언트에서 1초 간격으로 10개의 요청을 보내도록 하였다. 1초는 3-Way-Handshaking을 하는데 충분한 시간으로
요청 패킷이 SYN 큐 -> accept 큐까지 가는데 충분한 시간이다. 그래서 결국 SYN 큐에는 요청들이 머물지 않고 accept 큐에서만 요청이 머물게 된다.
요청마다 충분한 텀이 있기 때문에 accept 큐에만 요청이 쌓이다가 그 이상의 요청이 오게 되면 서버에서는 ACK 응답을 주지 않고 클라이언트 측에서는 timeout이 발생한다.

만약 클라이언트 요청 간의 1초 간격을 없애면 어떻게 될까? SYN 큐의 크기가 10이고, accept 큐 크기가 5라고 가정하자.
이 상황에서 클라이언트로부터 동시에 7개의 요청이 들어온다고 생각해보자.
클라이언트는 SYN 패킷 7개를 전송하고, 서버의 SYN 큐에 7개의 요청이 쌓인다.
서버는 클라이언트에게 SYN + ACK 응답을 보낸다.
그 후 서버는 클라이언트로 총 7개의 ACK를 받아 `ESTABLISHED` 상태가 되어, 7개의 요청을 accept 큐에 넣을 것이다. 그런데 accept 큐의 크기는 5이다.
따라서 5개의 요청은 큐에 들어가고, 나머지 2개의 요청은 버려진다. 그렇지만 해당 2개의 요청은 이미 `ESTABLISHED` 상태이기 때문에 클라이언트와의 TCP 연결을 끊기 위해 RST 패킷을 전송한다.
아래 그림3은 요청이 몰렸을 때, 2개의 RST 패킷이 발생하는 상황을 표현한다.

![[그림3]RST 패킷 발생](img_2.png)

## 문제 해결 및 마무리

지금까지 내용을 정리해보면 `Connection reset by peer` 예외는 클라이언트가 RST 패킷을 수신할 때 발생한다.
이 RST 패킷은 서버의 accept 큐에 너무 많은 요청이 동시에 도착하여 오버플로우가 발생할 때, 서버가 클라이언트에게 전송하여 소켓 연결을 종료한다.

이 문제를 해결하기 위해선 listen() 함수의 backlog 값을 조절하거나, 커널 파라미터를 수정할 필요가 있다.
앞서 살펴본 바와 같이 **min(somaxconn, backlog)** 공식에 따라, somaxconn 값이 backlog보다 작으면 그 값이 적용된다. 따라서 somaxconn 값이 너무 작으면 조정이 필요하다.

그렇다면 적절한 accept 큐의 크기는 얼마일까? 이는 서버의 환경과 상황에 따라 다르다. 무조건적으로 accept 큐의 크기를 늘린다고 해서 처리량이 그만큼 비례해서 늘어나는 것은 아니다. 
대신, 리눅스에서는 이를 참고할 수 있는 통계를 제공한다.

- TcpExtListenOverflows :  SYN 큐에서 발생하는 오버플로를 추적한다.
- TcpExtListenDrops : accept 큐에서 발생하는 드롭을 추적한다.

```
$ sudo apt-get install iproute2

$ nstat -az TcpExtListenDrops
TcpExtListenDrops 12946172 0.0

$ nstat -az TcpExtListenOverflows
TcpExtListenOverflows 11447 0.0
```

또는 netstat의 Recv-Q 로 SYN 큐에 쌓인 요청 수를 알 수도 있다.

```shell
$ netstat -an
Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp       20      0 0.0.0.0:8888            0.0.0.0:*               LISTEN
```

이러한 통계를 활용하면 서버의 상황에 맞게 최적의 값을 결정할 수 있다.





## 더 읽을거리
- https://blog.cloudflare.com/syn-packet-handling-in-the-wild/
- https://www.alibabacloud.com/blog/tcp-syn-queue-and-accept-queue-overflow-explained_599203
- https://brunch.co.kr/@alden/6


[^id1]: https://man7.org/linux/man-pages/man2/accept.2.html
[^id2]: 구체적으로 [inet\_reqeust\_sock](https://elixir.free-electrons.com/linux/v4.14.12/source/include/net/inet_sock.h#L73) 을 저장한다.    
[^id3]: https://elixir.bootlin.com/linux/v4.15.18/source/Documentation/networking/ip-sysctl.txt#L372    
[^id4]: https://man7.org/linux/man-pages/man2/listen.2.html    
[^id5]: https://elixir.bootlin.com/linux/latest/source/include/net/sock.h#L1033
[^id6]: https://elixir.bootlin.com/linux/latest/source/net/ipv4/tcp_input.c#L6942
[^id7]: https://www.alibabacloud.com/blog/tcp-syn-queue-and-accept-queue-overflow-explained_599203
[^id8]: https://brunch.co.kr/@alden/6