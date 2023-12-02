---
layout: post
title: "자바의 synchronized와 volatile"
tags:
  - Java
lang: ko-KR
date: 2023-12-02
update: 2023-12-20
---



## 메모리 아키텍처
최신 하드웨어에서의 동시 프로그래밍은 동일한 물리적 순간에 서로 다른 코어에서 여러 스레드를 동시해 실행할 수 있다.
아래 [그림2]에서 이를 확인할 수 있다.
![[그림2] 메모리 아키텍처](./img_1.png)

각 CPU는 자체 레지스터를 포함하고 있는데, 이는 CPU 내부의 메모리로 간주된다. 레지스터에 접근하고 여기에 있는 변수들에 연산을 수행하는 것은 매우 빠르다.
CPU는 캐시 메모리 계층을 가지고 있으며, 이 캐시 메모리에 빠르게 접근할 수 있다. 그러나 캐시 메모리의 접근 속도는 레지스터만큼 빠르지는 않다.

모든 CPU는 메인 메모리에 접근할 수 있다. 메인 메모리는 CPU의 캐시 메모리보다 훨씬 크다.
CPU가 메모리에서 무언가를 읽을 필요가 있을 때, 그것을 CPU의 캐시 메모리로 읽어들이고 연산을 수행한다.
CPU는 레지스터로도 데이터를 읽어들일 수 있다. CPU가 메모리에 데이터를 다시 쓸 필요가 있을 때, 레지스터를 캐시 메모리로 플러시하고 결국 이 캐시 메모리는 메인 메모리로 플러시된다.

일반적으로 플러시는 CPU가 다른 정보를 위한 공간을 만들 필요가 있을 때 수행된다. 따라서 이 플러시가 언제 일어날지에 대해서는 어떠한 가정도 할 수 없다.

## Memory Visiblity 
메모리 가시성(Memory Visiblity)이란, 한 스레드에서 변경한 메모리 값이 다른 스레드에서도 동일한 값을 읽을 수 있는지라고 볼 수 있다.
아래 코드는 가시성 문제가 발생할 수 있는 예제 코드이다.
```JAVA
public class Volatile {

    private static boolean stopRequested;

    public static void main(String[] args) throws InterruptedException {
        Thread backgroundThread = new Thread(() -> {
            int i = 0;
            while (!stopRequested) {
                i++;
            }
        });
        backgroundThread.start();

        Thread.sleep(1000);
        stopRequested = true;
    }
}
```

위 코드를 메인 스레드와 backgroundThread가 각각 다른 CPU 코어에 할당되어 실행되는 경우, 프로그램이 영원히 종료되지 않을 수 있다. 메모리 아키텍처의 특성상, 메인 스레드가 stopRequested 플래그를 true로 설정하더라도 이 변경은 메인 스레드가 할당된 코어의 캐시 메모리에만 저장될 수 있다. 결과적으로, backgroundThread는 메인 스레드에서 이루어진 이 변경을 감지하지 못할 수 있다. 이러한 현상을 가시성 문제라고 부른다.


## synchronized 의미

synchronized 키워드는 특정 코드 블록이나 메서드에 적용할 수 있다. 특정 코드 블록이나 메서드에 들어가지 전에 스레드가 적절한 잠금을 획득해야한 다는 것을 의미한다. 한번에 하나의 스레드만 synchronized 블록을 진행할 수 있으며, 다른 스레드는 잠금을 획득할 때 까지 진입하지 못한다.

메서드에 붙인 synchronized 키워드는 객체 인스턴스에 속한 잠금을 획득해야 한다. 만약 메서드가 정적 메서드라면 클래스 객체에 속한 잠금을 획득해야 한다. 코드 블록에 synchronized 키워드를 사용하면 어떤 객체를 사용하여 잠금을 획득할지 명시해야 한다.

잠금을 획득한 후, synchronized 블록에 진입하면, 블록 내에서 이루어진 모든 변경사항은 메인 메모리로 플러쉬된다.
다른 스레드가 이후에 같은 객체의 synchronized 블록에 진입하면, 메인 메모리에서 객체의 최신 상태를 읽는다.

따라서, synchronized 는 잠금뿐만 아니라 동기화를 수행하는데, 동기화의 의미는 특정 객체에 대한 메모리 표현이 다른 스레드 간에 일관되게 유지된다는 것으로 해석할 수 있다.


## synchronized 특징
아래는 synchronized 키워드의 그 외 대표적인 특징들이다.
- 객체만 잠금 가능: 자바에서는 기본 데이터 타입(primitives)이 아닌 객체(Object)만 잠금이 가능하다.

- 객체 배열의 잠금: 객체의 배열을 잠그는 것은 배열 내의 개별 객체들을 잠그는 것이 아니다.

- 동기화된 메소드: synchronized 메소드는 전체 메소드를 포함하는 synchronized (this){...} 블록과 동등하다.(바이트 코드 레벨에서는 다르게 나타난다.)

- 정적 synchronized 메소드: static synchronized 메소드는 클래스 객체(Class object)를 잠근다.

- 클래스 객체의 잠금: 클래스 객체를 잠그는 경우, getClass()는 런타임 클래스에 대한 잠금, MyClass.class에 대한 잠금은 컴파일 시점에 결정된다.

- Inner 클래스의 동기화: Inner 클래스에서의 동기화는 outer 클래스와 독립적이다.

- 인터페이스의 메소드 선언과 synchronized: synchronized는 메소드 시그니처가 아니므로 인터페이스에 선언할 수 없다.

- 비동기화 메소드: 비동기화 메소드는 잠금의 상태를 고려하지 않으며, 동기화 메소드가 실행되는 동안에도 진행될 수 있다.

- 재진입 가능한 잠금: 이미 잠금을 보유하고 있는 스레드가 동일한 잠금에 대한 synchronized 잠금을 만나면 계속해서 진행할 수 있다.


## volatile
volatile 필드에 대한 값은 스레드에 의해 사용되기 전에 항상 메인 메모리에서 읽는다. 그리고, 스레드가 작성한 값은 항상 메인 메모리로 플러시된다.
volatile과 synchronized의 차이는 synchronized는 배타적인 잠금을 사용하여 한 번에 하나의 스레드만 synchronized 블록을 실행할 수 있도록 보장하는 반면에, volatile는 잠금을 사용하지 않는다.

volatile 변수는 상태 의존적인 작업에 적합하지 않다. 예를 들어, `x = x + 1` 같은 연산은 x의 현재 값을 읽고, 그 값을 수정하여 다시 x에 저장하는 non-atomic 연산이다.
이는 x의 값을 읽는 사이에 다른 스레드가 x를 수정할 수 있으며, 이는 race condition을 일으킬 수 있기 때문에 안전하지 않다.

```JAVA
public class Volatile {

    private static volatile boolean stopRequested;

    public static void main(String[] args) throws InterruptedException {
        Thread backgroundThread = new Thread(() -> {
            int i = 0;
            while (!stopRequested) {
                i++;
            }
        });
        backgroundThread.start();

        Thread.sleep(1000);
        stopRequested = true;
    }
}
```
volatile로 선언된 stopRequested 플래그는 메인 스레드에서 값을 true로 변경하게 되면 이후에 발생하는 모든 해당 변수에 대한 후속 읽기는 항상 최신의 값을 읽는다는 것을 보장한다. 

## 참조
- https://dev.to/rnowif/what-is-a-volatile-variable-in-java-35ef
- https://docs.oracle.com/javase/specs/jls/se8/html/jls-17.html