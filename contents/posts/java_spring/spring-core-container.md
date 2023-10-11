---
layout: post
title: "스프링으로 알아보는 IoC 컨테이너의 원리와 이해"
tags: 
 - 스프링
lang: ko-KR
date: 2023-10-11
update: 2023-10-11
---

## What is Light-Weight Container?

애플리케이션 코드가 실행되는 프레임워크를 의미한다. 애플리케이션 객체(대부분 비즈니스 객체)는 컨테이너 내부에서 실행되며 컨테이너에 의해 관리된다고 한다. 다음은 경량 컨테이너가 가지는 특징들이다.

- 비침투성 (Non-invasiveness): 이는 애플리케이션 코드에 특별한 의존성을 부과하지 않는 컨테이너를 의미한다. 예를 들어, 기존의 코드를 수정하지 않고도 컨테이너 내에서 실행할 수 있어야 한다. 이는 인프라가 애플리케이션 코드에 불필요한 의존성을 부과하지 않아야 함을 의미한다.

- 빠른 시작: 컨테이너는 빠르게 시작되어야 한다. 이는 개발 및 배포 시간을 줄이고, 사용자에게 빠른 응답 시간을 제공한다..

- 특별한 배포 단계 불필요: 컨테이너 내의 객체를 배포할 때 특별한 단계나 복잡한 설정 없이 쉽게 배포할 수 있어야 한다.

- 다양한 환경에서의 실행: 컨테이너는 그 크기와 API 의존성이 최소화되어 다양한 환경에서 실행될 수 있어야 한다. 예를 들면 웹 컨테이너, 독립 실행형 클라이언트, 아니면 애플릿에서도 실행될 수 있어야 한다.

- 관리 객체 추가의 낮은 장벽: 컨테이너는 객체를 배포하고 관리하는 데 있어서 노력과 성능 오버헤드가 최소화되어야 한다. 이는 세밀한 객체뿐만 아니라 대형 컴포넌트도 쉽게 배포하고 관리할 수 있어야 함을 의미한다.



## Container Benefits

- Pluggability: 컨테이너는 다양한 컴포넌트의 플러그 가능성을 제공한다. 예를 들면, 동일한 컴포넌트 인터페이스에 대해 다른 EJB 구현 클래스를 사용할 수 있다. 이렇게 하면 호출 코드가 구현 전략에서 격리된다. 자바 인터페이스는 완벽한 분리를 제공하지만, 어떤 인터페이스의 구현을 사용할 것인지 결정하는 방법이 필요하다. 자바 코드에 하드코딩하면 인터페이스를 사용하는 많은 이점이 사라진다.

- Consistency: 컨테이너 인프라가 없으면 서비스 조회가 불규칙적이게 된다. 다른 서비스 객체는 개발자의 선호에 따라 다르게 위치할 수 있다. 구성 관리도 마찬가지로 불규칙적이게 돼서 지속적인 유지 관리 문제를 초래할 수 있다.

- One stop shop: 컨테이너만 찾으면 그 안의 모든 서비스를 찾을 수 있다. 모든 객체에 대해 전용 싱글톤이나 팩토리가 필요 없다.

- Delivery of enterprise services: 일관된 접근 방식을 사용하면 컨테이너 모델의 일부로, 또는 추가 기능으로 엔터프라이즈 서비스를 제공하는 것이 더 쉬워진다.


## Inversion Of Control

애플리케이션 코드가 컨테이너에 의존하는 것을 피하는 것이 좋다고 언급했다. 그런데 이게 어떻게 가능할까? 대부분의 비즈니스 객체는 다른 비즈니스 객체, 데이터 접근 객체, 리소스와 같은 의존성을 가진다. 그럼 객체들이 다른 관리 객체나 리소스를 찾아야 하고, 그러한 조회를 만족시킬 수 있는 컨테이너에 의존해야 하지 않을까? 컨테이너에 의존성을 도입하지 않고 의존성을 만족시키는 것은 제어의 역전(Inversion of Control)과 의존성 주입(Dependency Injection)의 마법을 통해 대부분 가능하다.

제어의 역전은 프레임워크에서 중요한 개념이다. 이는 "Don’t call us, we’ll call you." 라는 할리우드 원칙을 통해 가장 잘 이해된다.

의존성 주입은 제어의 역전을 사용하여 모든 조회 코드를 제거하고, 컨테이너가 언어 수준에서 표현된 의존성을 자동으로 해결하게 한다.

## Dependency Injection
이 방법은 컨테이너에게 의존성 조회를 완전히 맡기고, 관리되는 객체가 JavaBean setter 메서드나 생성자 인수를 통해 초기화될 때 의존성이 그 안으로 전달될 수 있게 하는 것이다.

이것을 언어 기반의 IoC라고 부른다. 왜냐하면 특별한 컨테이너 API나 인터페이스에 의존하지 않기 때문이다. 의존성 주입을 사용하면 IoC 컨테이너가 모든 연결 작업을 처리한다. 컨테이너는 리소스를 찾는 것을 담당하고, 비즈니스 객체에 필요한 리소스를 제공한다. 애플리케이션 코드에 영향을 주지 않고 필요한 리소스를 얻기 위한 다른 접근 방식을 사용하도록 컨테이너를 재구성할 수 있다.

의존성 주입 방식은 여러 가지 장점을 제공한다.

- 애플리케이션 코드에서 리소스나 다른 객체를 찾기 위한 코드(lookup)가 완전히 제거된다. 이는 코드를 더 깔끔하게 만들어 준다.

- 컨테이너 API에 대한 의존성 없어 순수한 자바 언어 개념만을 다룰 수 있다.

- 의존성 주입을 위해 특별한 인터페이스를 구현할 필요가 없다.

## Spring IoC Container
스프링의 기본적인 경량 컨테이너 인터페이스는 BeanFactory 이다.

```JAVA
public interface BeanFactory {
	Object getBean(String name) throws BeansException;
	Object getBean(String name, Class requiredType) throws BeansException;
	boolean containsBean(String name);
	boolean isSingleton(String name) throws NoSuchBeanDefinitionException;
	String[] getAliases(String name) throws NoSuchBeanDefinitionException;
	// ...
}
```

BeanFactory 인터페이스는 문자열 이름으로 빈 인스턴스를 조회하기 위한 getBean 메서드를 제공한다.


BeanFactory는 계층 구조의 일부일 수 있는데, 특정 팩토리에서 bean을 찾을 수 없으면 부모 팩토리에게 요청된다. 이렇게 해서 최상위 팩토리까지 찾게 된다. 상위 컨텍스트의 bean 정의는 하위 컨텍스트에서 볼 수 있지만 반대는 아니다.

BeanFactory 인터페이스의 대부분의 구현은 이름별로 객체를 등록하는 것뿐만 아니라 그 객체들을 IoC를 사용하여 구성하는 데 풍부한 지원을 제공한다. 예를 들어, 관리되는 객체 간의 의존성과 간단한 속성을 관리한다.

아래는 BeanFactory 인터페이스를 확장한 ListableBeanFactory 인터페이스이다.
```JAVA
public interface ListableBeanFactory extends BeanFactory { int getBeanDefinitionCount();
	String[] getBeanDefinitionNames();
	String[] getBeanDefinitionNames(Class type);
	boolean containsBeanDefinition(String name);
	Map getBeansOfType(Class type, boolean includePrototypes,
	boolean includeFactoryBeans) throws BeansException
}
```

ListableBeanFactory는 팩토리 내의 bean을 나열하는 것을 지원하는 하위 인터페이스다. 이는 정의된 bean의 수, 모든 bean의 이름, 주어진 유형의 인스턴스인 bean의 이름을 검색하는 메서드를 제공한다.

ListableBeanFactory를 사용하면 프로그램이 실행되는 도중에, 즉 런타임에 어떤 객체들이 필요한지 알게 되고, 그 객체들과 함께 작동하게 만들 수 있다.

다시 말해, 프로그램을 작성할 때 모든 객체를 미리 알 수 없을 때, ListableBeanFactory를 사용하면 실행 중에 필요한 객체들을 찾아서 그것들과 함께 작업할 수 있게 도와준다.


어떤 객체들은 초기화와 종료 시점에 콜백을 받길 원할 수 있다. Spring의 빈 팩토리는 이를 위한 두 가지 방법을 제공한다. 콜백 인터페이스를 구현하거나, 콜백 메서드를 선언적으로 지정하는 것이다.

Spring에서 제공하는 두 개의 콜백 인터페이스는 org.springframework.beans.factory.InitializingBean과 org.springframework.beans.factory.DisposableBean이다. 이들은 속성이 설정된 후와 빈 팩토리가 종료될 때 간단한 인자 없는 콜백 메서드를 제공한다.

```JAVA
public interface InitializingBean {
	
	void afterPropertiesSet() throws Exception;

}
```

```JAVA
public interface DisposableBean {
	
	void destroy() throws Exception;

}
```

때로는 특정 빈이 자신이 속해 있는 빈 팩토리에 직접 접근해야 할 때가 있다. 예를 들어, 빈이 자신을 관리하는 빈 팩토리의 다른 서비스나 기능을 사용하려 할 때 그렇다.

이런 경우를 위해 Spring은 초기화 시점에 해당 빈에게 자신이 속해 있는 빈 팩토리의 참조(reference)를 제공하는 콜백(callback) 기능을 제공한다. 이렇게 하면 빈은 자신을 관리하는 빈 팩토리에 직접 접근할 수 있다.

이 콜백을 수신하기 위해서는 BeanFactoryAware 인터페이스를 구현하면 된다.

```JAVA
public interface BeanFactoryAware extends Aware {
	
	void setBeanFactory(BeanFactory beanFactory) throws BeansException;

}
```

이러한 setBeanFactory 메서드는 InitializingBean 인터페이스의 afterPropertiesSet 메서드보다 먼저 호출된다.
소개한 인터페이스는 애플리케이션 코드보다 Spring 프레임워크 자체 내에서 더 자주 사용된다.


## Spring ApplicationContext
Spring은 빈 팩토리(bean factory)를 확장하여 애플리케이션 컨텍스트(application context) 라는 개념을 제공한다. 애플리케이션 컨텍스트는 빈 팩토리의 기능을 포함하면서도 추가적인 기능들을 제공한다.

- 메시지 소스 지원: 키를 통해 지역화된 메시지를 일반적인 방식으로 검색하는 기능을 제공한다. 기본 구현은 리소스 번들에서 메시지를 읽어온다.
- 파일 리소스 접근: 실제 리소스 환경(예: 파일 시스템 또는 ServletContext)에 의존하지 않고 상대 경로를 통해 리소스를 로드하는 기능이다.
- 애플리케이션 이벤트 지원: Observer 디자인 패턴의 구현으로, 등록된 애플리케이션 리스너에게 애플리케이션 이벤트를 발행한다. 이를 통해 이벤트 발송자와 수신자 간의 결합도를 낮춘다. 또한, 리스너는 컨텍스트 생명주기 이벤트의 알림도 받을 수 있다. Spring의 AOP 프레임워크는 애플리케이션 "이벤트"의 알림 설정을 위한 대안이 될 수 있다.

중심이 되는 인터페이스는 ApplicationContext이다. 이 인터페이스는 ListableBeanFactory를 확장한다. 따라서 애플리케이션 코드는 ApplicationContext를 마치 BeanFactory처럼 사용할 수 있다.

### BeanFactoryPostProcessor

애플리케이션 컨텍스트는 Bean Factory Post-processing 라는 기능을 제공한다. 이 기능을 통해 애플리케이션 컨텍스트에서 읽어들인 빈 정의를 수정하거나 변경할 수 있다.

```JAVA
@FunctionalInterface
public interface BeanFactoryPostProcessor {
	
	void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException;

}
```

이 인터페이스를 구현하면 컨텍스트가 시작될 때 이 후처리기들은 콜백을 받을 수 있으며, 다른 모든 빈들보다 먼저 적용되기 때문에 다른 빈의 정의를 변경할 수 있다.

예를 들면, 빈의 설정 정보(XML 등)에 정확한 값 대신에 플레이스홀더가 들어갈 수 있다. 데이터베이스 연결 정보나 외부 API 키 같은 민감한 정보를 직접 XML에 쓰는 대신 {db_password}와 같은 플레이스홀더를 사용할 수 있다.

즉, 후처리는 빈의 설정 정보를 최종적으로 조정하거나 완성하는 단계라고 볼 수 있다.


## 스프링 DI의 내부 동작
앞서 언급한 인터페이스들은 스프링 컨테이너의 내부 구현에 있어 핵심적인 역할을 하는 인터페이스이다. 그러나 일반 애플리케이션 개발자가 직접 사용할 일은 많지 않다.
여기서는 스프링의 DI가 이러한 핵심 인터페이스들을 어떻게 활용하여 동작하는지에 대해 살펴볼 것이다.

컴포넌트 스캔, 세부적인 구현 등 복잡한 내용은 일단 제쳐두고, 앞서 살펴본 핵심 인터페이스로 @Autowired의 DI 동작 방식에 초점을 맞춰보자.
아래 예제는 Programmatic 방식으로 DI를 적용한 예시이다.

1. ItemService 와 ItemRepository 인터페이스를 구현한다.

```JAVA
public class ItemService {

	@Autowired ItemRepository itemRepository;

	public void printItemName(){
		System.out.println(itemRepository.getItemName());
	}
}

public interface ItemRepository {

	String getItemName();
}


public class ItemRepositoryImpl implements ItemRepository {

	@Override
	public String getItemName() {
		return "hello world";
	}
}
```

2. Annotation Config 기반 스프링 빈을 설정한다.

```JAVA
@Configuration
public class MyConfig {

	@Bean
	public ItemRepository itemRepository(){
		return new ItemRepositoryImpl();
	}
}

```

3. AutowireCapableBeanFactory 빈 팩토리를 사용하여 ItemService 의존성을 주입한다.
```JAVA
public class DIApplication {

	public static void main(String[] args) {

		ApplicationContext context = new AnnotationConfigApplicationContext(MyConfig.class);
		AutowireCapableBeanFactory beanFactory = context.getAutowireCapableBeanFactory();

		// Spring의 제어 밖에서 ItemService의 인스턴스를 생성한다
		ItemService itemService = new ItemService();

		// AutowireCapableBeanFactory를 사용하여 의존성을 자동 주입한다.
		beanFactory.autowireBean(itemService);

		// itemService 의 의존성 주입이 완료되었다.
		itemService.printItemName(); // output : "hello world"

	}
}
```

위의 예제에서, ItemService의 인스턴스는 Spring의 빈 생명주기를 관리하지 않는 외부에서 생성되었지만, AutowireCapableBeanFactory를 사용하여 ItemRepository 인터페이스에 대한
의존성을 주입할 수 있다.

AutowireCapableBeanFactory는 BeanFactory의 확장 인터페이스로 기존의 빈 인스턴스에 대한 자동 와이어링 기능을 제공하는 인터페이스이다.

```JAVA
public interface AutowireCapableBeanFactory extends BeanFactory {

	/**
	 * Populate the given bean instance through applying after-instantiation callbacks
	 * and bean property post-processing (e.g. for annotation-driven injection).
	 * <p>Note: This is essentially intended for (re-)populating annotated fields and
	 * methods, either for new instances or for deserialized instances. It does
	 * <i>not</i> imply traditional by-name or by-type autowiring of properties;
	 * use {@link #autowireBeanProperties} for those purposes.
	 * @param existingBean the existing bean instance
	 * @throws BeansException if wiring failed
	 */
	void autowireBean(Object existingBean) throws BeansException;
}
```

autowireBean 메서드는 주어진 빈 인스턴스에 대한 후처리(Post-Processing)를 수행하여 @Autowired와 같은 어노테이션을 사용한 필드나 메서드를 채우는 역할을 한다.
autowireBean 메서드는 주어진 빈 인스턴스에 대해 @Autowired와 같은 어노테이션을 사용하여 필드나 메서드에 값을 주입하는 역할을 한다.   

메서드의 내부 구현을 살펴보면 아래와 같은 로직을 확인할 수 있다.
```JAVA
for (InstantiationAwareBeanPostProcessor bp : getBeanPostProcessorCache().instantiationAware) {
	PropertyValues pvsToUse = bp.postProcessProperties(pvs, bw.getWrappedInstance(), beanName);
	// ...	
}
```
InstantiationAwareBeanPostProcessor 인스턴스들을 순회하며 postProcessProperties 메서드를 호출하는 것을 볼 수 있다. InstantiationAwareBeanPostProcessor 인터페이스는 BeanPostProcessor의 확장으로, 프로퍼티의 사후 처리를 위한 추가적인 콜백 메서드를 제공한다.

실제로 의존성 주입은 InstantiationAwareBeanPostProcessor 인터페이스를 구현한 AutowiredAnnotationBeanPostProcessor 클래스의 postProcessProperties 메서드 내에서 수행된다.

아래는 AutowiredAnnotationBeanPostProcessor 클래스의 postProcessProperties() 메서드 코드이다.

```JAVA
public class AutowiredAnnotationBeanPostProcessor implements SmartInstantiationAwareBeanPostProcessor, BeanFactoryAware {

	@Override
	public PropertyValues postProcessProperties(PropertyValues pvs, Object bean, String beanName) {
		InjectionMetadata metadata = findAutowiringMetadata(beanName, bean.getClass(), pvs);
		try {
			metadata.inject(bean, beanName, pvs);
		}
		catch (BeanCreationException ex) {
			throw ex;
		}
		catch (Throwable ex) {
			throw new BeanCreationException(beanName, "Injection of autowired dependencies failed", ex);
		}
		return pvs;
	}

}
```

metadata.inject(bean, beanName, pvs); 라인에서 실제로 의존성 주입이 발생한다.

AutowiredAnnotationBeanPostProcessor가 의존성을 주입하기 위해서는 먼저 주입할 객체가 Spring 컨테이너에서 관리되어야 한다. 그리고 해당 컨테이너를 참조하여 필요한 객체를 찾아야 한다.
이때 컨테이너를 어떻게 참조할까? 바로 BeanFactoryAware 인터페이스를 구현함으로써 beanFactory를 주입받을 수 있다. AutowiredAnnotationBeanPostProcessor는 내부적으로 주입받은 beanFactory를 멤버 변수에 저장하고 있다. 그리고 postProcessProperties 메서드가 호출될 때, 이 beanFactory를 사용하여 필요한 빈을 검색하고, 그것을 통해 DI를 수행한다.

위에서 살펴본 Spring의 핵심 인터페이스인 beanFactory -> BeanPostProcessor -> BeanFactoryAware -> beanFactory 중심으로 코드가 나타나고 있는 것을 볼 수 있다.


## 완전한 Spring IoC
위에서 살펴본 예제는 DI의 작동 방식을 설명하기 위한 것으로 완전한 IoC가 적용된 것으로 보기는 어렵다.
코드 내에서 직접 컨텍스트를 생성하고, 인스턴스를 만들며, 주입하는 과정이 특정 기술에 의존적인 침투적인 방식으로 작성되었다.
이제 Spring에 제어권을 넘기고, 컨텍스트의 생성과 객체의 생성 및 조립을 프레임워크에 완전히 위임하는 방식을 살펴보자.

```JAVA
public class ItemService {

	ItemRepository itemRepository;

	public void printItemName(){
		System.out.println(itemRepository.getItemName());
	}
}

public interface ItemRepository {

	String getItemName();
}


public class ItemRepositoryImpl implements ItemRepository {

	@Override
	public String getItemName() {
		return "hello world";
	}
}
```
```JAVA
@Configuration
public class MyConfig {

	@Bean
	public ItemService itemService(){
		return new ItemService(itemRepository());
	}
	
	
	@Bean
	public ItemRepository itemRepository(){
		return new ItemRepositoryImpl();
	}
}
```

```JAVA
@SpringBootApplication
public class DIApplication {

	@Autowired ItemService itemService;
	
	public static void main(String[] args) {
		SpringApplication.run(DIApplication.class, args);
	}

	@Bean
	public ApplicationRunner applicationRunner() {
		return args -> itemService.printItemName();
	}

}
```
SpringApplication.run 메서드가 실행되면서 메인 스레드의 제어권이 스프링 프레임워크로 넘어간다.
그 후, Spring 프레임워크는 @Configuration 이 붙은 자바 설정 파일을 읽어 설정 파일에 맞게 객체를 생성하고 조립한다.
우리는 객체 조립에 대한 설정 파일만 제공한하면 Spring이 나머지 작업을 처리해준다.

## 마무리
경량 컨테이너의 특징과 그 장점을 살펴보았고 IoC 컨테이너의 필요성에 대해서도 살펴보았다.
Dependency Injection은 IoC의 중심 역할을 한다는 것을 알게 되었다.
더불어, 스프링에서 IoC 컨테이너를 어떻게 구성하는지, 그리고 그것이 실제로 어떻게 작동하는지 핵심 인터페이스와 함께 구체적인 예제를 통해 알아보았다.

스프링은 트랜잭션 추상화, 캐시 추상화, AOP 등의 엔터프라이즈 개발 API를 손쉽게 제공하지만, 그 중심에는 IoC 컨테이너가 있다고 생각한다.
IoC 컨테이너는 객체지향 조립 프레임워크의 역할을 하며, 이를 통해 객체 지향 설계에 집중할 수 있게 되었다.
그렇지 않았다면, 객체를 조립하고 생성하는 데에 훨씬 더 많은 시간을 소비했을 것이다.

## 참조
- Expert One-on-One J2EE Development without EJB (Rod Johnson, Juergen Hoeller) 
- https://docs.spring.io/spring-framework/reference/core/beans.html


