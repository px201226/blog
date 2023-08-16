---
layout: post
title: "JPA가 느릴 수 밖에 없는 원초적인 이유"
tags: 
 - JPA
lang: ko-KR
date: 2023-07-21
update: 2023-07-21
---

## N+1 쿼리는 무엇을 의마하나?
JPA의 한계를 설명하기 위해서는 N+1 쿼리가 발생하는 원초적인 원인에 대해 이해하는 것이 필요하다.   
JPA를 사용하다보면 N+1 쿼리를 경험할 수 있는데, 기술적인 방법으로 N+1 쿼리를 해결하는 게시물은 많지만, 왜 이러한 쿼리가 발생하는지에 대해 정확히 설명하는 블로그는 찾기 어렵다.  
본 포스팅에서는 N+1 쿼리가 발생하는 원인을 설명하고, 이로 인해 JPA가 성능상 한계에 부딪힐 수밖에 없는 이유에 대해 설명하려고 한다.

<!-- more -->
```JAVA
@Entity
public class Member {

    @Id @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    private String username;

    @ManyToOne
    @JoinColumn(name = "team_id")
    private Team team;
}
```
```JAVA
@Entity
public class Team {

    @Id @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    private String teamName;

    @OneToMany
    private List<Member> members;
}
```
```JAVA
@Transactional
@SpringBootTest
class JpaTest{
	
	@Test
	void Nplus1테스트() {

		final var teams = em.createQuery("select team from Team team", Team.class)
				.getResultList();

		for (final Team team : teams) {
			team.getMembers().forEach(member -> System.out.println(member.getUsername()));
		}
	}
}
```
위의 테스트 코드를 실행시키면 team 을 조회하는 쿼리(1)와 각 team 별로 자식인 member 조회하는 쿼리(N)이 나가, 결과적으로 N+1 쿼리가 발생한다.

아래는 테스트 코드를 돌렸을 때, 데이터베이스로 호출되는 SQL이다.
```SQL
SELECT * FROM team; /-- (1번 쿼리) --/
SELECT * FROM member where member.team_id = 1; /-- (N 쿼리) --/
SELECT * FROM member where member.team_id = 2; /-- (N 쿼리) --/
```

간단한 이유로 N+1 쿼리가 발생하는 이유는 다음과 같다. member와 join 없이 team에 대해서만 select 쿼리를 날렸기 때문이다.
처음에 (1번) 쿼리에서는 Team만 조회되었기 때문에, 연관된 테이블인 member를 찾기 위해 추가적인 쿼리가 필요하게 된다. 이로 인해 쿼리의 수가 N+1개가 되는 것이다.

아래는 Native SQL로 N+1 쿼리를 발생시키는 코드다. (예시)
```JAVA
class JpaTest {
	
	@Test
	void native_sql_Nplus1(){

		final var teams = jdbcTemplate.query("SELECT * FROM team", teamRowMapper);

		for (final Team team : teams) {
			final var member = jdbcTemplate.query("SELECT * FROM member WHERE member.team_id = " + team.getId(), memberRowMapper);
			member.forEach(m -> System.out.println(m.getUsername()));
		}

	}
}
```
N+1 쿼리는 JPA 입장에서는 연관 관계 맵핑 정보를 보고 그대로 쿼리를 실행한 결과로 볼 수 있다. JPA는 객체지향적인 관점에서 데이터를 가져오기 위해 연관된 엔티티들을 필요에 따라 추가로 조회하는 것이므로, 이는 JPA의 기능을 잘 수행한 것이다.
그러나 데이터베이스 입장에서는 N번의 호출로 인해 비효율적인 처리가 발생하였다.

N+1 쿼리를 해결하기 위해 크게 두 가지 방법이 있다.

- member와 team을 join하는 방법.
- member를 조회할 때 중복을 제거한 team의 id 값들로 batch IN절을 사용해 테이블 각각을 조회 후, 어플리케이션에서 조립하는 방법.

JPA에서는 N+1 쿼리를 해결하기 위해 fetch join, EntityGraph, batch size 조정 등의 방법을 제공하지만, 결국은 위의 두 가지 방법을 사용해야 한다.
또한, N+1 쿼리는 조회뿐만 아니라 UPDATE, DELETE 쿼리에서도 발생할 수 있다.
```JAVA
@Transactional
@SpringBootTest
class JpaTest{
	
	@Test
	void Nplus1테스트() {

		final var teams = em.createQuery("select team from Team team", Team.class)
				.getResultList();

		for(Team team : teams){
		  team.setTeamName("ABC");	
		}
	}
}
```
```SQL
SELECT * FROM team; /-- (1번 쿼리) --/
UPDATE team SET team.teamName = 'ABC' WHERE team.id = 1; /-- (N 쿼리) --/
UPDATE team SET team.teamName = 'ABC' WHERE team.id = 2; /-- (N 쿼리) --/
UPDATE team SET team.teamName = 'ABC' WHERE team.id = 3; /-- (N 쿼리) --/
```
이런 경우에도 쿼리 최적화가 필요하며, 모든 team 을 조회해서 teamName을 'ABC' 로 바꾸기 때문에 아래와 같은 방법으로 해결할 수 있다.
```SQL
UPDATE team SET team.teamName = 'ABC'
```
특정 team 만 업데이트 하고 싶다면 아래와 같은 방법을 쓸 수 있다.
```SQL
UPDATE team SET team.teamName = 'ABC' WHERE team.id (1,2,3);
```

## 관계형 데이터베이스는 집합이다
앞에서 본 N+1 쿼리와 그것을 튜닝한 쿼리의 방식에 차이점이 보이는가?
관계형 데이터 모델은 수학의 집합론을 기반으로 한 데이터베이스 모델로, 관계형 데이터베이스의 데이터 연산은 집합적 연산으로 이루어져 있고 이에 최적화되어 있다.
(교집합 연산 join, 합집합 연산 union, 부분집합 연산 select 등)    
N+1 쿼리를 해결하는 방법은 결국 단일 Element에 대한 연산을 여러 개 수행하는 것을 피하고, 대신 집합 연산을 활용하여 효율적으로 처리하는 것이다.
결과적으로, JPA가 성능상 한계에 부딪힐 수 밖에 없는 이유는 JPA가 엔티티 집합을 다루는 연산에 한계가 있기 때문이라고 볼 수 있다.

물론, JPQL을 사용하면 Native SQL을 사용하는 것 처럼 데이터베이스의 집합연산을 할 수 있다.    
UPDATE 문의 N+1 쿼리 예제에서 JPQL로 update문을 통해 teamName을 집합적으로 변경하는 로직으로 리팩토링 하면 다음과 같은 형식일 것 이다.
```java
/*
final var teams = em.createQuery("select team from Team team", Team.class).getResultList();

for(Team team : teams){
  team.setTeamName("ABC");
} */
teamRepository.renameAllTeams("ABC"); //renameAllTeams() 는 JPQL로 작성한 집합연산이다.
```
성능상의 문제는 해결되었지만, JPA로 객체지향적으로 작성한 원래의 코드가 사라지고,
데이터베이스 사용에 대한 투명성도 사리지게 되었다. 이는 JPQL을 활용한 최적화된 쿼리가 Native SQL과 거의 동일한 형태로 변환되었기 때문이다.
또한, 리팩토링된 코드는 JPQL을 네이티브 SQL로 파싱하는 과정만 추가된 것으로, Native SQL에 비해 JPQL이 가지는 장점도 거의 없다.

## 정리
결국 JPA가 성능적 한계는 집합 연산에 대한 지원이 부족하다는 것으로 요약할 수 있다.
우리가 어노테이션을 통해 JPA 연관관계에 대한 정보를 정의하지만 이것은 단일 엔티티에 대한 맵핑 정보를 제공하는 것 이다.
따라서, JPA는 엔티티 집합을 개별 엔티티 각각으로 처리할 수 밖에 없고, 이러한 작업은 집합론을 베이스로 한 관계형 데이터베이스에서
처리하기에는 느릴 수 밖에 없는 구조가 나오는 것 이다.
오히려 JPA의 방식은 Key-value 기반 스토리지에 더 적합한 방식이라고 볼 수 있다.   
이러한 문제점은 객체 패러다임과 관계형 패러다임 간에 쉽게 해결할 수 없는 문제라고 본다.   
지금 개발하고 있는 서비스는 엔티티의 집합적 연산을 요하는 요구사항이 많아, JPA 기술에 대한 의심이 있었는데   
이러한 ORM의 한계를 인정하면서 JPA의 객체지향적인 장점과 Native SQL 접근 방식을 균형있게 쓰는 것이 좋을 것 같다.





