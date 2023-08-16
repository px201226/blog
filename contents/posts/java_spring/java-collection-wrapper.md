---
layout: post
title: "엔티티 컬렉션을 객체지향적으로 다뤄보자!"
tags: 
 - 스프링
lang: ko-KR
date: 2023-06-23
update: 2023-06-23
---


# 1. 개요

- 상품을 저장하고 저장되어 있는 상품 가격의 합을 계산하는 서비스를 구현한다.
- 해당 요구사항의 절차지향적으로 구현해보고, Collection Wrapper 클래스를 두어 객체지향적인 코드로 리팩토링 해본다.
- Spring Data JPA 와 연동하는 방법도 알아본다.

<!-- more -->

# 2. 모델링

```java
@Getter
@Entity
public class Product {

	@Id @GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private Integer price;

}
```

```java
public interface ProductJpaRepository extends JpaRepository<Product, Long> {

}
```

```java
@Service
@RequiredArgsConstructor
public class ProductService {

	private final ProductJpaRepository productJpaRepository;

	public Integer getTotalPrice(){

        // 여기에 우리의 핵심 비지니스 로직인 상품 가격의 합계 계산 로직을 구현한다.
	}
}

```

## 2.1 절차지향적인 구현

```java
public Integer getTotalPrice(){

	final List<Product> products = productJpaRepository.findAll();

    Integer totalPrice = 0;
    for (Product product : Products){
      totalPrice += product.getPrice();
    }

    return price;
}
```

- DB로부터 상품을 조회해온 뒤, 컬렉션 원소를 돌면서 `totalPrice` 라는 로컬 변수에 상품 가격의 합계금액을 누적한다.
- 전형적인 절차지향적인 코드의 예다.

## 2.2 Java Stream API를 이용한 함수형 프로그래밍 구현

```java
public Integer getTotalPrice(){
	final List<Product> products = productJpaRepository.findAll();

    return products.stream()                   // (1)
              .map(Product::getPrice)          // (2)
              .reduce(0, Intger::sum);         // (3)
}
```

- 함수형 프로그래밍 스타일로 구현하였지만, 여전히 코드에서 합계금액을 계산하기 위한 절차를 기술하고 있다.
    - **(1)** List<Product> products 를 Stream 으로 반환한다. `(레코드를 건건히 처리할 것이다)`
    - **(2)** Product 타입을 getPrice() 로 Integer 타입으로 변환한다.
    - **(3)** Integer로 변환된 값을 0부터 누적시켜 합을 구한다.

## 2.3 객체지향적인 구현

```java
public Integer getTotalPrice(){
	final Products products = productJpaRepository.findAll();

    return products.getTotalPrice();
}
```

- Products 라는 List<Product> 의 Wrapper 클래스를 만들었다.
- 서비스 계층에서는 Products 라는 Collection Wrapper 클래스에게 상품의 합계금액을 계산하라는 메시지를 보낸다.
- 가장 객체지향적인 접근이다.

## 3. Collection Wrapper 클래스 구현

```java
@RequiredArgsConstructor
public class Products implements Iterable<Product> {

	private final Stream<Product> stream;

	@Override public Iterator<Product> iterator() {
		return stream.iterator();
	}

	public Integer getTotalPrice() {
		return stream
				.map(Product::getPrice)
				.reduce(0, Integer::sum);
	}
}

```

- `Iterable<Product>` 인터페이스를 구현한 Products 클래스를 정의한다.
- `Iterable` 은 컬렉션의 구현 방법을 노출시키지 않고, 컬렉션 요소들을 접근할 수 있게 하는 패턴,인터페이스다.
- `Iterable` 인터페이스를 구현하면 `for-each` 문 사용이 가능해지고, `Iterable` 를 통해 Products 래퍼클래스의 요소들을 순회할 수 있게 하였다.

## 4. Spring Data JPA 와의 연동

- Spring Data JPA 에서 위와 같은 패턴을 구현하려면 Spring Data JPA에 메서드 이름의 키워드를 보고 자동으로 쿼리 메서드를 만들어주는 Query Method 기능과 연동되어야 한다.
- 다행히 Spring Data JPA 에는 Query Method 에서는 여러 반환값을 지원하고 있으며, Streamable 인터페이스를 구현한 클래스를 반환값으로 받을 수 있다.
- 여기서는 `ProductsSCO` `(Spring Collection Object)` 라고 네이밍하였다.
    - `Streamable` 인터페이스가 Spring Data 모듈의 의존성을 가지기 때문에 때문에 도메인 Wrapper 클래스와 분리하기 목적으로 분리하였다.

```java
import org.springframework.data.util.Streamable;

class ProductsSCO implements Streamable<Product> {

  private final Streamable<Product> streamable;

  @Override
  public Iterator<Product> iterator() {
    return streamable.iterator();
  }

  	public Products toProducts(){
		return new Products(streamable.stream());
	}

}

interface ProductJpaRepository implements JpaRepository<Product, Long> {
  ProductsSCO findByPriceGreaterThan(Integer price);
}
```

- `ProductJpaRepository` 에 반환값이 Streamable 인터페이스를 구현한 `ProductsSCO` 래퍼 클래스 인 것을 볼 수 있다.
- 다만, 한계가 있는데 `List<T> findAll()` 과 같은 메서드들은 이미 `JpaRepository`에서 정의되기 때문에 `Products findAll()` 과 같은 형태로 재정의 할 수 없다.
-

## 5. Collection Wrapper 클래스를 적용한 전체 코드

- 먼저 도메인 모듈의 Spring에 대한 의존성을 분리하기 위해, domain 패키지와 springboot 패키지를 두었다.

### domain 패키지

```java
@Getter
@Entity
public class Product {

	@Id @GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private Integer price;
}
```

```java
public interface ProductRepository {

	Products findByPriceGreaterThan(Integer price);
}

```

```java
@RequiredArgsConstructor
public class Products implements Iterable<Product> {

	private final Stream<Product> stream;

	@Override public Iterator<Product> iterator() {
		return stream.iterator();
	}

	public Integer getTotalPrice() {
		return stream
				.map(Product::getPrice)
				.reduce(0, Integer::sum);
	}
}

```

```java
@Service
@RequiredArgsConstructor
public class ProductService {

	private final ProductRepository productRepository;

	public Integer getTotalPrice(){
		final var products = productRepository.findByPriceGreaterThan(0);

		return products.getTotalPrice();
	}
}

```

### springboot 패키지

```java
public interface ProductJpaRepository extends JpaRepository<Product, Long> {

	ProductsSCO findByPriceGreaterThan(Integer price);
}

```

```java
@RequiredArgsConstructor
@Repository
public class ProductRepositoryImpl implements ProductRepository {

	private final ProductJpaRepository productJpaRepository;

	@Override public Products findByPriceGreaterThan(final Integer price) {
		final var productsSCO = productJpaRepository.findByPriceGreaterThan(price);
		return productsSCO.toProducts();
	}
}

```

```java
@RequiredArgsConstructor
public class ProductsSCO implements Streamable<Product> {

	private final Streamable<Product> streamable;

	@Override public Iterator<Product> iterator() {
		return streamable.iterator();
	}

	public Products toProducts(){
		return new Products(streamable.stream());
	}

}

```

## **6. 참조**

[Spring Data JPA - Reference Documentation](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#repositories.collections-and-iterables.streamable-wrapper)