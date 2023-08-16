---
layout: post
title: "Redis Keyspace Notifications에 대해 알아보자"
tags: 
 - 레디스
lang: ko-KR
date: 2023-07-19
update: 2023-07-19
---

## Redis Keyspace Notifications
Redis에는 키 및 값의 변경 사항을 실시간으로 수신할 수 있는 Pub/Sub 기능을 제공한다.


## Notifications 유형
Redis 데이터 공간에 영향을 미치는 모든 작업에 대해 다음 두 가지 유형의 이벤트가 발생된다.
예를 들어 키를 삭제하는 명령인 `del myKey1` 이 실행되면 Redis는 다음 두 가지 명령이 트리거된다.
```redis
PUBLISH __keyspace@0__:mykey1 del
PUBLISH __keyevent@0__:del mykey1
```
첫번째 PUBLISH 명령은 Key 중심 이벤트로, `del`이 이벤트의 메시지고
두번쨰 PUBLISH 명령은 명령 중심 이벤트로, `myKey1`이 이벤트의 메시지이다.
Sub 하는 쪽에서는 Subscribe 패턴 매칭을 통해서 두 가지 유형 중 관심있는 이벤트만 선택해서 알림을 받을 수 있다.

<!-- more -->

## Redis Keyspace Notifications 설정
기본적으로 Keyspace Notifications은 비활성화되어 있기 때문에, `redis.conf` 또는 `CONFIG SET` 명령어로 `notify-keyspace-events` 옵션을 활성화 할 수 있다.
옵션에는 다음 값들이 있다.
이벤트 종류
- K   Keyspace events, publish prefix "__keyspace@<db>__:".
- E   Keyevent events, publish prefix "__keyevent@<db>__:".
- g   공통 명령: del, expire, rename, ...
- $   스트링(String) 명령
- l   리스트(List) 명령
- s   셋(Set) 명령
- h   해시(Hash) 명령
- z   소트 셋(Sorted set) 명령
- x   만료(Expired) 이벤트 (키가 만료될 때마다 생성되는 이벤트)
- e   퇴출(Evicted) 이벤트 (최대메모리 정책으로 키가 삭제될 때 생성되는 이벤트)
- A   모든 이벤트(g$lshzxe), "AKE"로 지정하면 모든 이벤트를 받는다.

여기서 K 또는 E는 필수적으로 있어야 하며, 나머지 값들은 선택적으로 설정할 수 있다.
예를 들어, 어떤 Key가 Expire되는지만 수신하고 싶다면 아래와 같이 설정하면 된다.
```
notify-keyspace-events "Kx": 키 이벤트 + 만료 이벤트 발생
```

Redis 명령에 따른 이벤트 종류를 보고 싶다면 [공식문서](https://redis.io/docs/manual/keyspace-notifications/)를 참조하자.


## 성능 측정
notify-keyspace-events 옵션을 모두 활성화 했을떄, 비활성화 했을 때 각가 redis-benchmark 를 통해 퍼모먼스를 테스트해보자.

### notify-keyspace-events "" 모든 이벤트 비활성화
```
# redis-cli config set notify-keyspace-events ""
# redis-benchmark -q 
```
```
PING_INLINE: 3670.67 requests per second, p50=12.391 msec
PING_MBULK: 3668.78 requests per second, p50=12.551 msec
SET: 4601.72 requests per second, p50=9.087 msec
GET: 4604.90 requests per second, p50=8.999 msec
INCR: 4708.98 requests per second, p50=8.847 msec
LPUSH: 4750.14 requests per second, p50=8.847 msec
RPUSH: 4620.86 requests per second, p50=8.967 msec
LPOP: 3531.82 requests per second, p50=13.231 msec
RPOP: 3863.84 requests per second, p50=12.007 msec
SADD: 4677.05 requests per second, p50=8.775 msec
HSET: 4795.01 requests per second, p50=8.743 msec
SPOP: 3689.49 requests per second, p50=12.087 msec
ZADD: 3968.57 requests per second, p50=10.575 msec
ZPOPMIN: 3116.62 requests per second, p50=15.095 msec
LPUSH (needed to benchmark LRANGE): 3900.31 requests per second, p50=10.743 msec
LRANGE_100 (first 100 elements): 4876.86 requests per second, p50=8.343 msec
LRANGE_300 (first 300 elements): 3725.23 requests per second, p50=12.071 msec
LRANGE_500 (first 500 elements): 2396.59 requests per second, p50=20.159 msec
LRANGE_600 (first 600 elements): 2067.31 requests per second, p50=23.663 msec
MSET (10 keys): 4288.53 requests per second, p50=9.711 msec
```

### notify-keyspace-events AKE 모든 이벤트 활성화
```
# redis-cli config set notify-keyspace-events AKE
# redis-benchmark -q 
```

```
PING_INLINE: 3299.57 requests per second, p50=14.319 msec
PING_MBULK: 3115.85 requests per second, p50=15.039 msec
SET: 3974.25 requests per second, p50=10.399 msec
GET: 3828.19 requests per second, p50=10.959 msec
INCR: 3869.07 requests per second, p50=10.791 msec
LPUSH: 3835.24 requests per second, p50=11.095 msec
RPUSH: 4118.96 requests per second, p50=10.247 msec
LPOP: 3102.89 requests per second, p50=14.991 msec
RPOP: 3178.03 requests per second, p50=14.895 msec
SADD: 3834.94 requests per second, p50=10.983 msec
HSET: 3825.41 requests per second, p50=11.111 msec
SPOP: 3389.03 requests per second, p50=13.735 msec
ZADD: 3750.94 requests per second, p50=11.207 msec
ZPOPMIN: 3117.69 requests per second, p50=14.855 msec
LPUSH (needed to benchmark LRANGE): 3835.68 requests per second, p50=11.103 msec
LRANGE_100 (first 100 elements): 4953.68 requests per second, p50=8.247 msec
LRANGE_300 (first 300 elements): 3687.04 requests per second, p50=12.079 msec
LRANGE_500 (first 500 elements): 2410.28 requests per second, p50=20.191 msec
LRANGE_600 (first 600 elements): 2059.44 requests per second, p50=23.647 msec
MSET (10 keys): 4043.02 requests per second, p50=10.143 msec
```
p50 응답시간은 큰 차이가 없지만 초당 request 처리가 100~500 정도 줄어든 것을 볼 수 있다.   
따라서, 이벤트 수신이 필요없다면 redis의 해당 설정은 비활성화하는 것이 리소스를 효율적으로 쓰는데 도움이 될 것 이다.
옵션을 활성화하더라도 꼭 필요한 이벤트 유형 옵션만 설정하는 것이 좋다.



## 스프링 부트 설정
```java
@Configuration
public class RedisConfig {


	@Bean(name = "redisMessageTaskExecutor")
	public Executor redisMessageTaskExecutor() {
		ThreadPoolTaskExecutor threadPoolTaskExecutor = new ThreadPoolTaskExecutor();
		threadPoolTaskExecutor.setCorePoolSize(2); 
		threadPoolTaskExecutor.setMaxPoolSize(4);
		return threadPoolTaskExecutor;
	}

	@Bean
	public RedisMessageListenerContainer RedisMessageListener(RedisConnectionFactory connectionFactory, RedisMessageListener redisMessageListener) {
		RedisMessageListenerContainer container = new RedisMessageListenerContainer();
		container.setConnectionFactory(connectionFactory);
		container.addMessageListener(redisMessageListener, new PatternTopic("*"));
		container.setTaskExecutor(asyncThreadTaskExecutor());
		return container;
	}

	@Bean
	public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
		RedisTemplate<String, Object> redisTemplate = new RedisTemplate<>();
		redisTemplate.setConnectionFactory(connectionFactory);
		redisTemplate.setKeySerializer(new StringRedisSerializer());
		redisTemplate.setValueSerializer(new StringRedisSerializer());
		return redisTemplate;
	}
}
```
```java
@Component
public class RedisMessageListener implements MessageListener {

    private final List<CacheManager> cacheManagerList;

    @Override
    public void onMessage(final Message message, final byte[] pattern) {
        log.info("{}", message);
    }
}
```

RedisMessageListenerContainer 빈 등록 시, 주의할 점은 setTaskExecutor() 로 스레드풀을 사용하는 Executor를 등록해야 한다.   
setTaskExecutor()로 Executor를 등록하지 않으면 RedisMessageListenerContainer는 기본값으로 SimpleAsyncTaskExecutor가 사용되는데,
SimpleAsyncTaskExecutor 는 사용될 때 마다, 새로운 스레드를 만들어서 run() 하기 때문에 Redis에서 이벤트가 수신될 때 마다 새로운 스레드가 만들어지므로 주의하자.
