---
layout: post
title: "디자인 패턴 - 구조 패턴"
tags: 
 - 디자인 패턴
lang: ko-KR
date: 2022-04-07
update: 2022-04-07
---


## 데코레이터 패턴

### OCP 살펴보기

- 클래스는 확장에는 열려 있어야 하지만 변경에는 닫혀 있어야 한다.
  - 기존 코드를 변경하지 않아도 확장할 수 있어야 한다.
  - 옵저버 패턴을 예로 들면 옵저버를 새로 추가하면 주제에 코드를 추가하지 않으면서도 얼마든지 확장이 가능하다.
- 모든 부분에서 OCP를 준수해야 하는가?
  - 현실적으로도 불가능하고 OCP를 지키다 보면 추상화가 필요한데, 추상화를 하다 보면 코드가 복잡해진다.
  - 그래서 디자인한 것 중에서 가장 바뀔 가능성이 높은 부분을 중심적으로 살펴보고 OCP를 적용하는 방법이 좋다.

<!-- more -->

<aside>
💡 무조건 OCP를 적용한다면 괜히 쓸데없는 일을 하며 시간을 낭비할 수 있으며, 필요 이상으로 복잡하고 이해하기 힘든 코드를 만들게 되는 부작용이 발생할 수 있다.

</aside>

### 데코레이터 패턴의 정의

- 데코레이터 패턴은 객체에 추가 요소를 동적으로 더할 수 있다.
- 데코레이터를 사용하면 서브클래스를 만들 때보다 훨씬 유연하게 기능을 확장할 수 있다.

![Untitled](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/a1d2e1b7-7f8f-4fe6-af62-bc391740ff17/Untitled.png)

- 데코레이터가 컴포넌트를 상속받는 이유
  - 상속으로 행동을 물려받는 것은 아님
  - 행동은 기본 구성 요소와는 데코레이터 등을 인스턴스 변수에 저장하여 호출하는 식
  - 데코레이터로 감싸는 객체와 형식을 맞추기 위해 상속 (원래 있던 구성 요소가 들어갈 자리에 자기가 들어갈 수 있어야 하므로)

### 데코레이터 패턴 구현하기

```java
// Component 클래스
public abstract calss Beverage {
	String description = "제목 없음";
	
	public String getDescription(){
		return description;
	}

	public abstract double cost();
}
```

```java
// 데코레이터 클래스(첨가물 클래스)
public abstract class CondimentDecorator extends Beverage { // 형식을 맞추기 위해 상속
	Beverage beverage; // 데코레이터가 감쌀 음료를 나타냄
	public abstract String getDescription();
}
```

#### 음료 코드 구현

```java
public class Espresso extends Beverage {
	
	public Espresso()[
			description = "에스프레소";
	}

	public doublc cost(){
		return 1.99;
	}
}
```

```java
public class HouseBlend extends Beverage {
	
	public Espresso()[
			description = "하우스 블렌드";
	}

	public doublc cost(){
		return 0.99;
	}
}
```

#### 첨가물 코드 구현

```java
public class Mocha extends CondimentDecorator {

	public Mocha(Beverage beverage){
		this.beverage = beverage;
	}

	public String getDescription(){
		return beverage.getDescription() + ", 모카";
	}

	public double cost(){
		return beverage.cost() + 0.2;
	}
}
```

#### 테스트 코드

```java
// 하우스 블렌드 커피 + 모카 2샷 + 휩 추가
Beverage beverage = new HouseBlend();
beverage = new Mocha(beverage);
beverage = new Mocha(beverage);
beverage = new Whip(beverage);
```

### 정리

- 데코레이터 패턴의 의도는 감싸고 있는 객체에 행동을 추가하는 용도이다.
- 만약 여러 단계의 데코레이터를 파고 들어가서 어떤 작업을 해야 한다면 데코레이터 패턴이 만들어진 의도와는 어긋난다.
- 추상 구상 요소(Component) 가 아닌 특정 Concrete Component의 의존하여 어떤 작업을 해야하는 경우에는 데코레이터 패턴의 의도와는 맞지 않기 때문에 패턴 사용을 다시 생각해봐야 한다.