---
layout: post
title: "Ehcache3 캐시 라이브러리 소개 (with Spring Boot)"
tags: 
 - 스프링
lang: ko-KR
date: 2023-07-24
update: 2023-07-24
---



## Spring Boot2 + Ehcache3

Spring Cache Abstract 와 Ehcache3 모듈 설정 방법을 알아본다.

## Gradle Dependency 설정

```
implementation("org.springframework.boot:spring-boot-starter-cache")
implementation("org.ehcache:ehcache:3.9.5")
implementation("javax.cache:cache-api:1.1.1")
```

## 캐시 구성

Ehcache3 버전부터는 JSR-107을 자바 표준 인터페이스를 구현하였다.
캐시에 대한 자바 표준 인터페이스를 JCache 라고 한다.
JPA 구현체에 Hibernate 와 EclipseLink 등이 있는 것 처럼 JCache 구현체 중 하나가 Ehcache3 이다.

<!-- more -->

### Ehcache Configuration

Ehcache는 Programmatic 과 xml 두 가지 방식으로 설정할 수 있다.
자세한건 [공식문서](https://www.ehcache.org/documentation/3.9/getting-started.html#configuring-with-java)를 참조하자.
여기서는 XML 방식이 조금 더 관리하기 쉬울 것 같아 XML 방식으로 설정한다.

```xml

<config
  xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
  xmlns='http://www.ehcache.org/v3'
  xmlns:jsr107="http://www.ehcache.org/v3/jsr107"
  xsi:schemaLocation="http://www.ehcache.org/v3 http://www.ehcache.org/schema/ehcache-core.xsd
        http://www.ehcache.org/v3/jsr107 http://www.ehcache.org/schema/ehcache-107-ext-3.0.xsd">

  <service>
    <jsr107:defaults enable-management="true" enable-statistics="true"/>
  </service>

  <cache-template name="default">
    <listeners>
      <listener>
        <class>com.example.springboot.cache.EhcacheEventListener</class>
        <event-firing-mode>ASYNCHRONOUS</event-firing-mode>
        <event-ordering-mode>UNORDERED</event-ordering-mode>
        <events-to-fire-on>CREATED</events-to-fire-on>
        <events-to-fire-on>UPDATED</events-to-fire-on>
        <events-to-fire-on>EXPIRED</events-to-fire-on>
        <events-to-fire-on>REMOVED</events-to-fire-on>
        <events-to-fire-on>EVICTED</events-to-fire-on>
      </listener>
    </listeners>
    <resources>
      <heap>100</heap>
      <offheap unit="MB">1</offheap>
    </resources>
  </cache-template>


  <cache alias="findByEventGroupId" uses-template="default">
    <key-type>java.lang.String</key-type>
    <value-type>com.marketboro.marketbom2.module.system.domain.entity.applicationmessage.Eventagsgregator</value-type>
    <expiry>
      <ttl unit="minutes">10</ttl>
    </expiry>
  </cache>

</config>
```

[공식문서](https://www.ehcache.org/documentation/3.9/xml.html)를 참조하여 XML의 element들을 정리하였다.

### `<config>`

XML 구성의 루트 요소이다. 하나의 `<config>` 요소는 CacheManager에 대한 정의를 제공한다.

### `<persistence>`

영속화 캐시 매니저를 생성할 때 사용되는 요소이다. 여기에는 디스크에 데이터를 저장해야 하는 디렉터리 위치가 필요하다.

### `<cache>`

`<cache>` 요소는 CacheManager에 의해 생성 및 관리될 Cache 인스턴스를 나타낸다.
`<cache>` 요소는 Alias를 필수적으로 지정해줘야한다. Alias는 네임스페이스 같은 역활을 한다.
Key 값이 같더라도 Alias(네임스페이스)가 다르면 다른 별개로 저장된다.

`<cache>` 요소는 아래 요소들을 포함할 수 있다.

1. `<key-type>`: 캐시 Key에 해당하는 풀패키지 클래스명
2. `<value-type>`: 캐시 Value에 해당하는 풀패키지 클래스명
3. `<expiry>`: 만료 유형에 대한 설정
4. `<eviction-advisor>`: 캐쉬 만료에 대한 advisor를 설정한다.
5. `<resource>`: 스토리지 계층과 용량을 설정한다. heap 만 사용할 경우 `<heap>` 으로 대체 가능

스토리지 계층은 다양한 데이터 저장 영역을 사용하도록 Ehcache를 구성할 수 있다.
Ehcache에서 지원하는 데이터 저장소는 다음과 같다.
계층 구조를 사용하여 다중 계층 설정도 가능하다. 캐시가 On-Heap 계층에 없으면 Off-heap 계층을 참조할 수 있다.
다중 계층 구조를 사용할 때 주의할점은, 아래 계층 스토리지 할당량보다 윗 계층 스토리지 할달량이 적어야 한다는 것이다.

- On-Heap Store   
  Java의 온-힙 RAM 메모리를 활용하여 캐시 항목을 저장합니다. 이 계층은 Java 애플리케이션과 동일한 힙 메모리를 사용하며, 모든 힙 메모리는 JVM 가비지 컬렉터에서 스캔해야 합니다. JVM이 사용하는 힙 공간이 많을수록 가비지 수집 일시 중지로 인해 애플리케이션 성능이 더
  많이 영향을 받습니다. 이 저장소는 매우 빠르지만 일반적으로 가장 제한된 저장소 리소스입니다.


- Off-Heap Store   
  사용 가능한 RAM에 의해서만 크기가 제한됩니다. Java 가비지 컬렉션(GC)의 영향을 받지 않습니다. 매우 빠르지만 데이터를 저장하고 다시 액세스할 때 JVM 힙으로 데이터를 이동해야 하므로 온-힙 스토어보다 느립니다.


- Disk Store    
  디스크 저장소 - 디스크(파일 시스템)를 사용하여 캐시 항목을 저장합니다. 이 유형의 저장소 리소스는 일반적으로 매우 풍부하지만 RAM 기반 저장소보다 훨씬 느립니다. 디스크 스토리지를 사용하는 모든 애플리케이션의 경우 처리량을 최적화하기 위해 빠른 전용 디스크를 사용하는 것이
  좋습니다.


- Clustered Store    
  이 데이터 저장소는 원격 서버에 있는 캐시입니다. 원격 서버에는 선택적으로 장애 조치 서버가 있어 고가용성을 향상시킬 수 있습니다. 클러스터형 스토리지는 클라이언트/서버 일관성 유지와 네트워크 지연 등의 요인으로 인해 성능이 저하될 수 있으므로 이 계층은 본질적으로 로컬 오프 힙
  스토리지보다 느립니다.
  Terracotta 라는 분산 캐시 서버로만 가능한 것 같다.

### `<cache-template>`

`<cache>` 요소가 템플릿을 상속받아 사용할 수 있다. `uses-template` 속성을 통해 cache-template을 참조할 수 있다.

## 캐시 교체 정책

Ehcache 2.x 버전에서는 힙 메모리에 대한 캐시 교체 정책`(LRU, LFU, FIFO)`을 지원했다. 그런데 Ehcache 3부터는 3가지 정책이 사라졌는데,
구글링을 통해 조사해본 결과, 힙 메모리 교체 정책과 다른 계층의 교체 정책이 다를 수 있기 때문에 지원이 중단된 듯 하다.
그래서 3 버전 기준으로는 다음 세가지 정책을 제공하고 있다.

- no expiry : 캐시 매핑이 만료되지 않음
- time-to-live : 캐시 매핑이 생성된 후 정해진 기간 후에 만료됨
- time-to-idle : 캐시 매핑이 마지막으로 액세스한 시간 이후 정해진 기간 후에 만료됨

```xml

<cache alias="withExpiry">
  <expiry>
    <ttl unit="seconds">20</ttl>
  </expiry>
  <heap>100</heap>
</cache>
```

### Custom expiry

Ehcache3 은 Custom expiry 정책을 정의할 수 있다. 아래 인터페이스를 구현하는 custom policy 클래스를 구현하면 된다.

```java
public interface ExpiryPolicy<K, V> {

	Duration INFINITE = Duration.ofNanos(Long.MAX_VALUE);
	ExpiryPolicy<Object, Object> NO_EXPIRY = new ExpiryPolicy<Object, Object>() {
		public String toString() {
			return "No Expiry";
		}

		public Duration getExpiryForCreation(Object key, Object value) {
			return INFINITE;
		}

		public Duration getExpiryForAccess(Object key, Supplier<?> value) {
			return null;
		}

		public Duration getExpiryForUpdate(Object key, Supplier<?> oldValue, Object newValue) {
			return null;
		}
	};

	Duration getExpiryForCreation(K var1, V var2);

	Duration getExpiryForAccess(K var1, Supplier<? extends V> var2);

	Duration getExpiryForUpdate(K var1, Supplier<? extends V> var2, V var3);
}
```

```xml

<cache alias="withCustomExpiry">
  <expiry>
    <class>com.pany.ehcache.MyExpiry</class>
  </expiry>
  <heap>100</heap>
</cache>
```

## Springboot Configuration

Ehcache3 는 JCache 므로 아래와 같이 설정해줘야 한다.

```yml
spring:
  cache:
    jcache:
      config: classpath:ehcache.xml
```

Ehcache 2.x 버전은 아래와 같이 설정한다.

```yml
spring:
  cache:
    ehcache:
      config: classpath:ehcache.xml
```

그리고 어플리케이션에 `@EnableCaching` 어노테이션을 붙여준다.

```java
@EnableCaching
@SpringBootApplication
public class ExampleApplication {

}
```

새 프로젝트로 시작한다면 여기까지만 해도 Springboot 와 Ehcache 설정은 완료된다.
만약, 프로젝트에 redis를 이미 사용 중이라면 redis가 Ehcache보다 우선순위가 높아 기본 CacheManger를 `RedissonSpringCacheManager`로 설정한다.
따라서, 따로 Ehcache용 CacheManager를 `@Bean`으로 등록해주어야 한다.
여기서 중요한것은 `org.springframework.cache.CacheManger` 인터페이스의 구현체로 `org.springframework.cache.ehcache.EhCacheCacheManager` 가 있는데, 이 클래스는 Ehcache2 버전에 사용되는 것이다.
처음에도 말했듯이 Ehcache3는 JCache의 한 종류로 `JCacheCacheManger로` 등록해줘야한다.

```java
import java.io.IOException;
import javax.cache.CacheManager;
import javax.cache.Caching;
import javax.cache.spi.CachingProvider;
import org.springframework.cache.jcache.JCacheCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

@Configuration
public class EhcacheConfig {

	@Bean(name = "ehCacheManager")
	public org.springframework.cache.CacheManager cacheManager() throws IOException {
		CachingProvider cachingProvider = Caching.getCachingProvider("org.ehcache.jsr107.EhcacheCachingProvider");
		CacheManager manager = cachingProvider.getCacheManager(
				new ClassPathResource("/ehcache.xml").getURI(),
				getClass().getClassLoader());

		return new JCacheCacheManager(manager);
	}
}
```

캐싱을 적용할 메서드에 @Cacheable 어노테이션을 붙여준다.

```java
public class CacheService {

	@Cacheable(cacheManager = "ehCacheManager", cacheNames = "Cache")
	public String findById(String id) {
		log.info("findById = {}", id);
		return id;
	}

}
```

Cache 라는 이름으로 메서드 인자인 id 값을 key로, return 값을 value로 결과를 캐싱한다.
@Cacheable은 다음 매개변수를 사용할 수 있다.

- value / cacheName : 메서드 실행 결과가 저장될 캐시의 이름입니다.
- key : SpEL(Spring Expression Language) 로 캐시 항목의 키입니다 . 매개변수를 지정하지 않으면 기본적으로 모든 메서드 매개변수에 대해 키가 생성됩니다.
- keyGenerator : KeyGenerator 인터페이스를 구현하여 사용자 정의 캐시 키 생성을 허용하는 Bean의 이름입니다.
- condition : 결과를 캐시할 시기를 지정하는 SpEL(Spring Expression Language)로서의 조건입니다.
- unless : 결과를 캐시하지 않아야 하는 경우를 지정하는 SpEL(Spring Expression Language)로서의 조건입니다.

스프링에서는 @Cacheable 말고도 @CacheEvict, @CachePut, @CacheConfig 어노테이션을 지원한다.
기본적인 내용은 @Cacheable 과 크게 다르지 않으므로 자세한 내용은 [공식문서](https://docs.spring.io/spring-framework/docs/3.2.x/spring-framework-reference/html/cache.html)를 참조하자.


## JSR 107 어노테이션, Spring Cache 어노테이션 비교

| JSR 107 / JCache Annotations | 	Spring Cache Annotations    |
|------------------------------|------------------------------|
| @CacheResult                 | @Cacheable                   |
| @CacheRemove                 | 	@CacheEvict                 |
| @CacheRemoveAll              | @CacheEvict(allEntries=true) |
| @CachePut                    | @CachePut                    |
| @CacheDefaults               | @CacheConfig                 |



