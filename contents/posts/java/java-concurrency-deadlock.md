---
layout: post
title: "Java의 동시성 프로그래밍 - Deadlock"
tags:
  - Java
lang: ko-KR
date: 2023-09-18
update: 2023-09-18
series: "Java의 동시성 프로그래밍"
---

## DeadLock
스레드 A각 잠금 L을 점유하고 있고 잠금 M을 획득하려고 시도하는 동시에 스레드 B가 잠금 M을 보유하고 있고 잠금 L을 획득하려고 시도하면 두 스레드는 영원히 대기하게 된다. 이러한 상황을 데드락이라고 한다.

## lock-ordering deadlocks
아래 코드는 leftRight(), rightLeft 메서드가 left, right 락을 서로 다른 순서로 잠금을 획득하려고 하기 때문에 데드락이 발생할 수 있다. lock-ordering 은 left, right 락을 필요로 하는 모든 스레드에서 항상 같은 순서로 left, right 락을 획득하도록 하면 데드락이 발생하지 않는다.

```JAVA
public class LeftRightDeadlock {

    private final Object left = new Object();
    private final Object right = new Object();

    public void leftRight() {
        synchronized (left) {
            synchronized (right) {
                doSomething();
            }
        }
    }

    public void rightLeft() {
        synchronized (right) {
            synchronized (left) {
                doSomethingElse();
            }
        }
    }
}
```

```
A ---> lock left -> try to lock right -> wait forever
B -----> lock right -> try to lock left -> wait forever
```


## Dynamic lock order deadlocks
데드락을 예방하기 위해 잠금 순서를 제어하기 명확하지 않을 때가 있다. 예를 들면 다음과 같은 fromAccount 에서 toAccount로 계좌 이체하는 코드이다.

```JAVA
public void transferMoney(Account fromAccount, Account toAccount, DollarAmount amount){
    synchronized (fromAccount) {
        synchronized (toAccount) {
            ...
        }

    }
}       
```
위의 코드는 아래와 같은 방식으로 from, to Account를 반대로 호출하면 데드락이 발생할 수 있다.
- A: transferMoney(myAccount, yourAccount, 10);
- B: transferMoney(yourAccount, myAccount, 20);

이런 경우에는 System::identityHashCode 와 같은 해시 코드를 사용하여 일관된 잠금 순서를 보장할 수 있다.
다만, hashCode 는 드물지만 중복되는 경우도 있기 때문에 해시 코드가 동일한 경우에도 잠금 순서를 보장할 수 있어야 한다. 이런 경우에 사용할 수 있는 방법이 *tie breaking* 방식이다.

tie breaking 방식은 fromAccount, toAccount 잠금을 획득하기 전에 tie breaking 잠금을 획득함으로써 한번에 두개의 잠금을 획득하여 데드락 가능성을 제거할 수 있다.

```JAVA
private static final Object tie = new Object();

public void transferMoney(Account fromAccount, Account toAccount, DollarAmount amount) {
    
    int fromHash = System.identityHashCode(fromAccount);
    int toHash = System.identityHashCode(toAccount);
    
    if(fromHash > toHash){
        synchronized (fromAccount){
            synchronized (toAccount){
                //...
            }
        }
    } else if(fromHash < toHash){
        synchronized (toAccount){
            synchronized (fromHash){
                //...
            }
        }
    } else {
        synchronized (tie){
            synchronized (fromAccount){
                synchronized (toAccount){
                    //...
                }
            }
        }
    }
}
```

## 객체 협력관계에서의 deadlocks
두 개 이상의 자원(또는 객체, 클래스 등)이 상호 작용을 해야 하는 상황에서 데드락이 발생할 수 있다.
클래스 A의 method1은 A의 상태를 업데이트하고, 클래스 B의 어떤 메서드를 호출한다.   
클래스 B의 method2는 B의 상태를 업데이트하고, 클래스 A의 상태를 참조한다.

이 두 메서드가 서로 다른 스레드에서 동시에 호출될 경우 데드락이 발생할 수 있다.
- method1은 A의 락을 획득하고 B의 메서드를 호출하기 전에 락을 유지한다.
- method2는 B의 락을 획득하고 A의 상태를 참조하기 전에 락을 유지한다.

이런 상황에서는 open call 이나 락의 범위를 축소하여 데드락 가능성을 제거할 수 있다.
- Open Call: 락 없이 메소드를 호출하는 것.
- synchronized 블록 축소: 전체 메소드에 synchronized를 사용하는 대신에, 실제로 공유 상태에 접근하는 부분만 synchronized 블록으로 묶는다.

> 결합된(composed) 객체를 나중에 동기화(synchronizing)하는 대신에 처음부터 동기화된 객체를 결합하는 것이 더 복잡하다. 동기화된 객체를 안전하게 사용하려면 오픈 콜(open calls)과 락의 순서 정하기(careful lock ordering) 같은 기술이 필요하다.


## 리소스 deadlocks
### 리소스 기반 데드락(Resource-based Deadlock)
예를 들어 두 개의 데이터베이스 연결 풀이 있다고 가정해보자. 스레드 A가 데이터베이스 D1에 연결을 확보하고, D2에 연결을 기다리고 있을 수 있다.
동시에 스레드 B가 D2에 연결을 확보하고 D1에 연결을 기다릴 수 있다.
이런 상황에서 두 스레드는 각각 다른 스레드가 확보하고 있는 리소스를 기다리므로 데드락이 발생한다.

### 스레드 기아 데드락(Thread-Starvation Deadlock)
이 형태의 데드락은 하나의 스레드가 결과를 기다리는 동안 다른 스레드가 그 결과를 생성해야 하는 상황에서 발생한다.
예를 들어, 하나의 작업이 결과를 생성하고, 다른 작업이 그 결과를 기다리는 경우, 첫 번째 작업이 완료되지 않으면 두 번째 작업도 영원히 기다리게 된다. 이는 특히 작업들이 한정된 스레드 풀에서 실행될 때 문제가 될 수 있다.


## Timed tryLock
명시적인 Lock 클래스의 "timed tryLock" 기능을 사용하면 무한정 대기하는 대신에 타임아웃을 설정할 수 있다.
일반적인 내장 락(intrinsic locks)은 락을 획득할 수 없으면 영원히 대기하게 되지만 명시적인 락(explicit locks)은 타임아웃을 설정할 수 있어, 락 획득에 실패하면 재시도할 수 있는 제어권을 얻을 수 있다.


## livelock
라이브락은 스레드가 차단되지는 않았지만 계속 실패할 수 있는 작업을 계속 재시도하여 스레드가 계속 진행되지 못하는 상태의 한 형태를 말한다.

예를 들어, 메시징 애플리케이션에서 메시지 처리에서 버그로 인해 특정 유형의 메시지가 항상 실패하면, 그 메시지는 계속해서 큐의 앞으로 돌아가고 다시 처리된다. 이러한 문제는 "poison message problem"이라고도 부른다. 스레드는 차단되지 않지만, 계속해서 같은 실패를 반복하므로 실제로는 작업이 진행되지 않는다.

또는, 협력하는 스레드에서 여러 스레드가 서로의 상태에 반응하여 변경하되, 그 결과로 어느 스레드도 진행되지 못하는 상태가 될 수 있다. 두 사람이 복도에서 서로 양보하면서 영원히 지나가지 못하는 상황을 생각할 수 있다.

이러한 유형의 라이브락을 해결하는 하나의 방법은 재시도 메커니즘에 무작위성을 도입하는 것 이다. 예를 들어, 이더넷 네트워크에서 두 스테이션이 동시에 패킷을 보내면 충돌이 발생한다고 할 때 두 스테이션은 재시도 시간에 무작위성을 도입하여 충돌을 피할 수 있다.

아래는 Worker1 과 Worker2가 같은 자원 commonResource에 접근하려고 시도하고, 스레드가 자원에 접근할 수 없는 경우 자원을 상대방에게 양보하여 livelock이 발생하는 예제이다.
```JAVA
public class LiveLockExample {
    static class CommonResource {
        private Worker owner;

        public CommonResource(Worker owner) {
            this.owner = owner;
        }

        public Worker getOwner() {
            return owner;
        }

        public synchronized void setOwner(Worker d) {
            owner = d;
        }
    }

    static class Worker {
        private String name;
        private boolean active;

        public Worker(String name, boolean active) {
            this.name = name;
            this.active = active;
        }

        public String getName() {
            return name;
        }

        public boolean isActive() {
            return active;
        }

        public synchronized void work(CommonResource commonResource, Worker otherWorker) {
            while (active) {
                // If resource is owned by someone else, wait
                if (commonResource.getOwner() != this) {
                    try {
                        wait(10);
                    } catch (InterruptedException e) {
                        // handle
                    }
                    continue;
                }

                // If other worker is also active, hand over the common resource to the other worker
                if (otherWorker.isActive()) {
                    System.out.println(getName() + " : handing over the resource to the worker: " + otherWorker.getName());
                    commonResource.setOwner(otherWorker);
                    continue;
                }

                // Now use the commonResource
                System.out.println(getName() + ": working on the common resource");
                active = false;  // work completed, so set active to false
                commonResource.setOwner(otherWorker);
            }
        }
    }

    public static void main(String[] args) {
        final Worker worker1 = new Worker("Worker 1 ", true);
        final Worker worker2 = new Worker("Worker 2", true);

        final CommonResource s = new CommonResource(worker1);

        new Thread(() -> worker1.work(s, worker2)).start();
        new Thread(() -> worker2.work(s, worker1)).start();
    }
}

```

> 위의 메시징 애플리케이션에서는 Dead-letter-Queue 나 Retry Limit, Exponential Backoff 방식을 사용할 수 있다.


## 참조
- Java Concurrency in practice