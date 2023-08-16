---
layout: post
title: "SpringBoot AutoConfiguration 시작하기"
tags: 
 - 스프링
lang: ko-KR
date: 2022-03-28
update: 2022-03-28
---

## @EnableAutoConfiguration

Spring Boot 애플리케이션이 시작되면 spring-boot-autoconfigure 모듈에 미리 정의된 Configuration 클래스들이 자동으로 구성됩니다. ([스프링 부트 자동 구성 목록](https://docs.spring.io/spring-boot/docs/current/reference/html/auto-configuration-classes.html#appendix.auto-configuration-classes))

Auto Configuration이 실제 실행되는지 여부는 클래스 경로에 종속 클래스가 있는지 여부에 따라 달라집니다.

예를 들어, `@ConditionalOnClass` 는 클래스 패스에 특정 class가 존재할 때만 조건이 만족됩니다.

<!-- more -->

## Custom AutoConfiguration Starter 만들기

### 1.  [application.properties](http://application.properties) 파일의 사용자 정의 속성

```java
@Data
@Component
@ConfigurationProperties(prefix = "custom")
public class CustomProperties {
	private String message;
	private String url;
}
```

@ConfigurationProperties의 접두사와 클래스 필드 이름은 [application.properties](http://application.properties) 와 맵핑됩니다.

```jsx
custom.message = hello world
custom.url = localhost
```

### 2.  라이브러리용 빈 만들기

```java
@Slf4j
@RequiredArgsConstructor
public class CustomService implements InitializingBean {

	private final CustomProperties customProperties;

	@Override
	public void afterPropertiesSet() throws Exception {
		log.info("CustomService init");
		log.info("message : {}", customProperties.getMessage());
		log.info("url : {}", customProperties.getUrl());
	}
}
```

### 3. AutoConfiguration

```java
@Configuration
@EnableConfigurationProperties(CustomProperties.class)
public class CustomAutoConfiguration {

	@Bean
	public CustomService customService(CustomProperties customProperties){
			return new CustomService(customProperties);
	}
}
```

### 4. spring.factories 파일 추가

`src/main/resources/META-INF` 경로에 다음 내용을 추가합니다.

```java
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.autoconfigure.configure.CustomAutoConfiguration
```

### 5. AutoConfiguration 사용

스타터를 사용할 프로젝트를 만들고 pom.xml에 종속성을 추가합니다.

```java
<dependency>
      <groupId>com.example</groupId>
      <artifactId>auto-configure</artifactId>
      <version>0.0.1-SNAPSHOT</version>
</dependency>
```

[application.properties](http://application.properties) 파일에 사용자 정의 속성을 정의하고 프로젝트를 시작하면 다음과 같이 빈이 초기화되는 것을 볼 수 있습니다.