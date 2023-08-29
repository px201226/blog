---
layout: post
title: "Collection Wrapper 클래스를 이용한 Service 계층 리팩토링 "
tags:
  - 스프링
lang: ko-KR
date: 2023-06-23
update: 2023-06-23
---

## 복잡한 Service 계층

Service 계층은 애플리케이션의 핵심 비즈니스 로직을 수행하는 중심적인 역할을 한다.
이 계층은 데이터 유효성 검증, 복잡한 계산 로직, 데이터베이스 CRUD 연산, 외부 API 통신, 그리고 트랜잭션 관리까지 다양한 책임을 지니고 있다.
실무에서 코드를 파악할 일이나 유지보수할 일이 생기면 가장 먼저 찾고 코드를 보는데 많은 시간을 할애하는 부분이 서비스 계층이기도 하다.

Service 계층은 애플리케이션의 비즈니스 로직을 수행하는 곳이기 때문에, 여기에 구현 코드가 위치하는 것은 자연스럽다.
다만, 비지니스 로직이 매우 복잡하고 하나의 Service에서 많은 유스케이스를 처리하게 되면 유지보수가 어려워진다.
실제로 복잡한 시스템은 Service 로직 하나가 몇 1000줄씩 필요한 경우도 있다.

비즈니스 로직의 실행에 필요한 절차적 논리와 연산은 프로그래밍 패러다임(절차적, 객체지향 등)에 관계없이 동일하다.
그러나 이러한 로직을 유지보수 가능한 형태로 구성하기 위해서는 객체지향적 설계 원칙을 적용하는 것이 효과적이다.

이 글에서는 Collection Wrapper 클래스를 활용하여 절차적으로 구성된 Service 계층의 코드를 객체지향적으로 리팩토링하는 방법을 소개하려고 한다.
Collection Wrapper 클래스는 컬렉션에 대한 연산을 캡슐화하여 코드의 가독성과 유지보수성을 향상시킬 수 있다.

## 절차적인 구현과 객체지향적 구현의 비교

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
public class ProductService {

	private final ProductJpaRepository productJpaRepository;

	public Integer getTotalPrice() {

		// 여기에 우리의 핵심 비지니스 로직인 상품 가격의 합계 계산 로직을 구현한다.
	}
}

```

### 전통적인 절차적인 구현

```java
@Service
public class ProductService {

	public Integer getTotalPrice() {

		final List<Product> products = productJpaRepository.findAll();

		Integer totalPrice = 0;
		for (Product product : Products) {
			totalPrice += product.getPrice();
		}

		return price;
	}
}
```

DB로부터 상품을 조회해온 뒤, 컬렉션 원소를 돌면서 `totalPrice` 라는 로컬 변수에 상품 가격의 합계금액을 누적한다.

### Stream API를 이용한 함수형 프로그래밍 구현

```java
@Service
public class ProductService {

	public Integer getTotalPrice() {
		final List<Product> products = productJpaRepository.findAll();

		return products.stream()                  // (1)
				.map(Product::getPrice)          // (2)
				.reduce(0, Intger::sum);         // (3)
	}
}
```

- 함수형 프로그래밍 스타일로 구현하였지만, 여전히 코드에서 합계금액을 계산하기 위한 절차를 기술하고 있다.
    - **(1)** List<Product> products 를 Stream 으로 반환한다. `(레코드를 건건히 처리할 것이다)`
    - **(2)** Product 타입을 getPrice() 로 Integer 타입으로 변환한다.
    - **(3)** Integer로 변환된 값을 0부터 누적시켜 합을 구한다.

### 객체지향적인 구현

```java
@Service
public class ProductService {

	public Integer getTotalPrice() {
		final Products products = productJpaRepository.findAll();

		return products.getTotalPrice();
	}
}
```

- Products 라는 List<Product> 의 Wrapper 클래스를 만들었다.
- 서비스 계층에서는 Products 라는 Collection Wrapper 클래스에게 상품의 합계금액을 계산하라는 메시지를 보낸다.
- 서비그 계층에서는 세부 구현 코드를 숨기고 구현의 대한 추상화를 제공한다.

### Collection Wrapper 클래스 구현

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

## 실전 예제로 보는 리팩토링

실무에서 자주 사용되는 upsert 로직을 구현한다고 가정해보자.
먼저 UserDto 객체를 입력으로 받는다.
이 입력된 UserDto는 User 엔티티의 ID 값으로 변환된다.
이 변환된 ID 값을 사용하여 데이터베이스에 조회한다.
만약 조회 결과 해당 ID를 가진 User 엔티티가 데이터베이스에 없다면 새로운 User를 생성한다.
반대로 이미 해당 ID를 가진 User 엔티티가 데이터베이스에 존재한다면, 이 엔티티를 업데이트한다.

### 절자적으로 구현된 upsert 

```JAVA
@Service
public class UserService {

	@Autowired
	private UserRepository userRepository;

	public void upsertUsers(List<UserDto> userDtos) {
		List<Long> userIds = userDtos.stream()
				.map(UserDto::getId)
				.collect(Collectors.toList());

		List<User> existingUsers = userRepository.findAllById(userIds);

		Map<Long, User> existingUserMap = existingUsers.stream()
				.collect(Collectors.toMap(User::getId, Function.identity()));

		List<User> usersToSave = new ArrayList<>();

		for (UserDto dto : userDtos) {
			User user = existingUserMap.get(dto.getId());
			if (user != null) {
				user.updateFromDto(dto);
			} else {
				user = new User(dto);
			}
			usersToSave.add(user);
		}

		userRepository.saveAll(usersToSave);
	}
}
```

Service 계층에서는 UserDto를 입력받아, 해당 데이터가 데이터베이스에 이미 존재하면 업데이트하고, 그렇지 않으면 새로 삽입하는 "upsert" 로직이 구현되어 있다.
이러한 접근 방식은 코드의 복잡성을 증가시키며, 특히 Service 계층의 코드가 수천 줄에 이르면 이해와 유지보수가 어려워진다.

또한, Map<Long, User> existingUserMap과 같은 구체적인 자료구조를 private 메서드에 인자로 전달하는 경우가 많다.
이렇게 되면, Long 타입의 키가 어떤 의미를 가지는지를 코드를 읽는 동안 인지하고 있어야 한다.
이는 코드의 가독성을 저하시키고, 이해하는 데에 추가적인 노력이 필요하게 된다.

### 개선 후 upsert

```JAVA
public class UserCollection {

	private final List<User> users;

	public UserCollection(List<User> users) {
		this.users = users;
	}

	public List<User> upsertFromDtos(List<UserDto> dtos) {
		Map<Long, User> userMap = users.stream()
				.collect(Collectors.toMap(User::getId, Function.identity()));

		List<User> upsertedUsers = new ArrayList<>();
		for (UserDto dto : dtos) {
			User user = userMap.get(dto.getId());
			if (user != null) {
				user.updateFromDto(dto);
			} else {
				user = new User(dto);
			}
			upsertedUsers.add(user);
		}
		return upsertedUsers;
	}
}

public class UpsertResult {

	public final List<User> updatedUsers;
	public final List<User> insertedUsers;

	public UpsertResult(List<User> updatedUsers, List<User> insertedUsers) {
		this.updatedUsers = updatedUsers;
		this.insertedUsers = insertedUsers;
	}
}


@Service
public class UserService {

	@Autowired
	private UserRepository userRepository;

	public void upsertUsers(List<UserDto> userDtos) {
		List<User> existingUsers = userRepository.findAllById(
				userDtos.stream()
						.map(UserDto::getId)
						.collect(Collectors.toList())
		);

		UserCollection userCollection = new UserCollection(existingUsers);
		UpsertResult result = userCollection.upsertFromDtos(userDtos);

		userRepository.saveAll(result.updatedUsers);
		userRepository.saveAll(result.insertedUsers);
	}
}
```

리팩토링 후의 코드에서는 UserDto를 데이터베이스에 업데이트할지, 새로 삽입할지 결정하는 로직이 UserCollection 클래스로 이동되었다.
이로 인해 UserService는 이제 UserCollection에 구체적인 작업을 위임하고, 그 결과만을 데이터베이스에 반영하게 된다.
추가적으로, 'upsert' 로직에 다른 연산이 필요한 경우에도 UserCollection을 파라미터로 전달하는 방식을 사용할 수 있다.
이렇게 하면, 구체적인 자료구조 대신 추상화된 UserCollection을 사용하여 더 높은 수준의 추상화와 캡슐화를 달성할 수 있게 된다.

## Spring Data JPA 와의 연동

Spring Data JPA 에서 위와 같은 패턴을 구현하려면 Spring Data JPA에 메서드 이름의 키워드를 보고 자동으로 쿼리 메서드를 만들어주는 Query Method 기능과 연동되어야 한다.
다행히 Spring Data JPA 에는 Query Method 에서는 여러 반환값을 지원하고 있으며, Streamable 인터페이스를 구현한 클래스를 반환값으로 받을 수 있다.

```java
import org.springframework.data.util.Streamable;

public class Products implements Streamable<Product> {

	private final Streamable<Product> streamable;

	@Override
	public Iterator<Product> iterator() {
		return streamable.iterator();
	}


}

interface ProductJpaRepository implements JpaRepository<Product, Long> {

	Products findByPriceGreaterThan(Integer price);
}
```

`ProductJpaRepository` 에 반환값이 Streamable 인터페이스를 구현한 `ProductsSCO` 래퍼 클래스 인 것을 볼 수 있다.
다만, `List<T> findAll()` 과 같은 메서드들은 이미 `JpaRepository`에서 정의되기 때문에 `Products findAll()` 과 같은 형태로 재정의 할 수 없다.

## 참조

[Spring Data JPA - Reference Documentation](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#repositories.collections-and-iterables.streamable-wrapper)