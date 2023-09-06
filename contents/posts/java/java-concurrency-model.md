---
layout: post
title: "웹 서버를 위한 동시성 프로그래밍 모델"
tags:
  - Java
lang: ko-KR
date: 2023-09-07
update: 2023-09-07
---



## 동시성 프로그래밍 모델
동시성은 여러 태스크가 동시에 실행된다는 시스템 속성이다. 또한 태스크들 사이에서 상호 작용을 수행할 수 있다.
이러한 동시성은 단일 코어 프로세서부터 멀티 코어 프로세서, 다중 프로세서, 그리고 분산 시스템까지 다양한 컴퓨팅 환경에서 구현될 수 있다.
주 목적은 사용자의 응답성을 향상시키고 처리량을 증가시키는 것이다.

동시성은 주로 멀티스레딩과 연관되어 있지만, 멀티스레딩에서 발생하는 문제들은 분산 시스템에서도 유사하게 나타난다.
이는 두 시스템 모두 컴퓨팅 리소스를 효율적으로 활용하여 하나의 목표를 달성하기 위한 메커니즘이기 때문이다.
공유 상태 관리, 작업 분산, 그리고 작업 순서 조정과 같은 공통적인 문제가 포함된다.

웹 서버의 경우, 일반적으로 요청과 처리의 워크플로우를 가지며, 여러 웹 요청을 동시에 처리할 수 있어야 한다.
여기서는 인기있는 인기있는 웹 프레임워크의 동시성 프로그래밍 모델에 대해서 알아보려고 한다. 


## Thread-based Concurrency
스레드 기반 접근 방식은 들어오는 각 요청을 별도의 스레드와 연결한다. thread-per-request 모델이라고도 한다.
Thread-based Concurrency 모델은 스레드가 원격 호출, File I/O 등의 이유로 블로킹될 수 있다고 가정한다.
이러한 이유로 대량 스레드풀을 사용하여 스레드 하나가 요청 하나를 처리한다.
또한 요청 처리에 필요한 모든 작업을 순차적으로 코딩할 수 있기 때문에 코딩 난이도 및 디버깅이 용이하다는 장점이 있다.
아래는 Socket 기반 요청이 들어올 때 마다 Counter 값을 증가시키고 응답하는 간단한 웹 서버를 구현한 코드이다.

```JAVA
public class Main {

	public static void main(String[] args) throws IOException {
		log.info("start");
		final var counter = new Counter();
		try (var socket = new ServerSocket(8080)) {

			while (true) {
				final var clientSocket = socket.accept();
				log.info("accept client");
				new Thread(new WorkerRunnable(clientSocket, counter)).start();
			}
		}


	}

	static class Counter {

		private Integer count = 0;


		public synchronized Integer increase() {
			return count++;
		}
	}

	static class WorkerRunnable implements Runnable {

		private final Socket clientSocket;
		private final Counter counter;

		public WorkerRunnable(Socket clientSocket, Counter counter) {
			this.clientSocket = clientSocket;
			this.counter = counter;
		}

		@Override
		public void run() {
			try {
				BufferedReader input = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
				OutputStream output = clientSocket.getOutputStream();
				final var time = LocalDateTime.now();
				String readLine;
				String req = "";
				while ((readLine = input.readLine()) != null) {
					if (req.equals("")) {
						req = readLine;
					}
					if (readLine.equals("")) { // If the end of the http request, stop
						break;
					}
				}

				if (req == null || req.equals("") || req.contains("favicon.ico")) {
					return;
				}
				final var increase = counter.increase();

				output.write(
						("HTTP/1.1 200 OK\n\nWorkerRunnable: " +
								increase + " - " + time + "").getBytes()
				);
				output.flush();
				output.close();
				input.close();
				log.info("Request processed: {}", increase);
			} catch (IOException ex) {
				throw new RuntimeException(ex);
			}

		}
	}
}
```

Counter 클래스는 여러 스레드가 Counter 값을 증가시키기 위해 쓰기 경쟁이 발생할 수 있다.
이는 Counter 값이 변경 가능한 공유 상태이기 때문에 Counter 값이 CPU 스케줄링과 같은 
특정 타이밍에 따라 연산의 결과가 달라질 수 있기 때문이다. 이러한 상황을 경쟁 상태(Race Condition) 이라고 한다.

경쟁 상태의 원인은 변경 가능한 공유 변수에 대한 연산이 atomic operation이 아니기 때문이다.
wiki 에서는 atomic operation을 다음과 같이 정의하고 있다.
> 원자적 연산은 연산이 실행되는 동안 다른 프로세스가 해당 연산 중에 읽거나 변경하는 상태를 읽거나 변경할 수 없는 연산을 의미합니다.

즉, atomic operation은 단순히 쪼갤 수 없는 연산이 아니라 한 번에 하나의 코드 섹션을 실행할 수 있는 operation 이라고 볼 수 있다.
여기서는 counter 변수에 값을 증가시키는 메서드를 synchronized 로 동기화하여 경쟁 상태를 해결하였다.
공유 상태를 사용하는 동시성 모델의 경우 자바에서는 synchronized 와 같은 잠금 메커니즘을 사용하게 된다.

잠금을 사용하면 임계 영역에 대한 엑세스를 직렬화하여 atomic operation을 구현할 수 있다. 
잠금은 너무 크게 잡으면 동시성이 떨어지고, 잠금을 너무 미세하게 잡으면 데드락, 기아상태 등을 유발하기 쉬워진다.

스레드 기반 동시성 모델의 또 다른 단점은 Context-Switching 오버헤드이다.
CPU가 한 스레드 실행에서 다른 스레드 실행으로 전환할 때 CPU는 현재 스레드의 로컬 데이터, 프로그램 포인터 등을 저장하고 실행할 다음 스레드의 로컬 데이터, 프로그램 포인터 등을 로드해야 한다.
이 비용은 결코 저렴하지 않다. 불필요한 컨텍스트 스위칭으로 많은 시간을 허비할 수도 있다.

## Event-driven Concurrency
Event-driven Concurrency은 이벤트에 응답하여 동시에 여러 작업을 수행하는 프로그래밍 방식을 의미한다.
이는 전통적인 스레드 기반의 동시성과는 다르게 동작하는데, 스레드 기반 동시성은 여러 스레드가 동시에 실행되는 반면,
Event-driven Concurrency은 일반적으로 한 스레드 내에서 여러 작업을 비동기적으로 수행된다.
따라서 스레드 관리, 동기화 문제, 데드락 등의 복잡한 동시성 문제에서 자유롭다.

대신, 스레드 기반 동시성에 비해 실행 흐름을 파악하기 어렵고 콜백 지옥 같은 문제로 코드 복잡성이 증가할 수 있다.
CPU 집약적인 작업(이미지 처리, 동영상 처리) 등 에는 적합하지 않을 수 있다. 한 작업이 너무 오래 걸리면 다른 이벤트 처리가 지연될 수 있기 때문이다.

이러한 패러다임은 Node.js, Vert.x 등의 프레임워크에서 사용된다.

```JAVA
interface EventHandler {
    void handle(SelectionKey key) throws IOException;
}

public class ReactorEventLoopExample {
    public static void main(String[] args) throws IOException {
        Selector selector = Selector.open();
        ServerSocketChannel serverChannel = ServerSocketChannel.open();
        serverChannel.configureBlocking(false);
        serverChannel.socket().bind(new InetSocketAddress(8080));
        SelectionKey key = serverChannel.register(selector, SelectionKey.OP_ACCEPT);
        key.attach(new AcceptHandler(selector, serverChannel));

        while (true) {
            int readyChannels = selector.select();
            if (readyChannels == 0) continue;
            Set<SelectionKey> selectedKeys = selector.selectedKeys();
            Iterator<SelectionKey> keyIterator = selectedKeys.iterator();
            while (keyIterator.hasNext()) {
                SelectionKey selectionKey = keyIterator.next();
                EventHandler handler = (EventHandler) selectionKey.attachment();
                if (handler != null) {
                    handler.handle(selectionKey);
                }
                keyIterator.remove();
            }
        }
    }
}

class AcceptHandler implements EventHandler {
    private final Selector selector;
    private final ServerSocketChannel serverSocketChannel;
    private int counter = 0;  // 카운터 추가

    public AcceptHandler(Selector selector, ServerSocketChannel serverSocketChannel) {
        this.selector = selector;
        this.serverSocketChannel = serverSocketChannel;
    }

    @Override
    public void handle(SelectionKey key) throws IOException {
        SocketChannel clientChannel = serverSocketChannel.accept();
        if (clientChannel != null) {
            counter++;  // 클라이언트가 연결될 때마다 카운터 증가
            System.out.println("Client accepted. Current connection count: " + counter);
            clientChannel.configureBlocking(false);
            SelectionKey clientKey = clientChannel.register(selector, SelectionKey.OP_READ);
            clientKey.attach(new ReadHandler(clientChannel));
        }
    }
}

class ReadHandler implements EventHandler {
    private final SocketChannel socketChannel;

    public ReadHandler(SocketChannel socketChannel) {
        this.socketChannel = socketChannel;
    }

    @Override
    public void handle(SelectionKey key) throws IOException {
        ByteBuffer buffer = ByteBuffer.allocate(256);
        int read = socketChannel.read(buffer);

        if (read > 0) {
            String output = new String(buffer.array()).trim();
            System.out.println("Received: " + output);
        } else if (read == -1) {
            socketChannel.close();
        }
    }
}
```
위의 예제는 싱글 스레드를 사용한 이벤트 루프 방식의 간단한 서버이다. 싱글 스레드로 동작하기 때문에 counter 값을 동기화하기 위한 스레드 조정이 필요없다.
싱글 스레드를 사용하기 때문에 Race condition이 발생하지 않고 context switching 오버헤드도 발생하지 않는다.
이벤트 루프 내 Blocking I/O 작업이 발생하면 이벤트 루프가 블록킹 상태로 유지되기 때문에 이러한 작업은 별도의 백그라운드 스레드에서 처리해야 동시성을 높일 수 있다.


## Actor-based Concurrency 

