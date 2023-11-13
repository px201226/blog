---
layout: post
title: "MySQL 잠금과 트랜잭션 Deep Dive"
tags:
 - 데이터베이스
lang: ko-KR
date: 2023-11-11
update: 2023-11-11
---


## 잠금 엑세스 레벨

### 공유 잠금(Shared Locks)

공유 잠금은 다수의 쿼리가 동시에 진행될 수 있도록 허용하지만 배타적 잠금을 얻으려는 시도를 차단한다. 즉, 어떤 트랜잭션이 공유 잠금을 적용하고 있다면, 해당 데이터에 대한 쓰기 작업을 시도하는 다른 트랜잭션은 잠금이 해제될 때까지 기다려야 한다.

MySQL에서는 `FOR SHARE`나 `LOCK IN SHARE MODE` 같은 locking read clauses를 사용해서 쿼리가 참조하는 행들에 잠금을 걸 수 있다. 이런 절이 쿼리에 포함되어 있으면, 해당 쿼리를 실행하는 동안 선택된 행들은 다른 트랜잭션에서 데이터를 읽을 순
있지만 변경하거나 삭제할 수는 없다.

이 잠금은 기본적으로 바깥쪽(outer) 쿼리에만 적용되고 내부(subquery) 쿼리에는 적용되지 않는다. 즉, 내부 쿼리에 별도로 잠금 절을 명시하지 않으면 내부 쿼리가 참조하는 테이블의 행은 잠금되지 않는다.

```SQL
SELECT *
FROM t1
WHERE c1 = (SELECT c1 FROM t2) FOR SHARE;
```

여기서 t1 테이블의 행들은 FOR SHARE로 인해 잠금이 걸리지만, 서브쿼리에서 참조하는 t2 테이블의 행들은 잠금이 걸리지 않는다.

```SQL
SELECT *
FROM t1
WHERE c1 = (SELECT c1 FROM t2 FOR SHARE) FOR SHARE;
```

두번째 예시에서는 t1 테이블 뿐만 아니라 서브쿼리 안에도 FOR UPDATE가 명시되어 있어서 t2 테이블의 행들도 잠금이 걸린다. 이 경우, t1과 t2 테이블에서 참조하는 모든 행들이 다른 트랜잭션에 의해 변경할 수 없다.

### 배타적 잠금(Exclusive Locks)

배타적 잠금은 해당 자원에 대한 접근을 획득한 스레드 혹은 트랜잭션만이 자원을 읽거나 쓸 수 있게 하며, 다른 스레드는 접근할 수 없다.

MySQL에서는 `FOR UPDATE` 를 사용해서 배타적 잠금을 걸 수 있다.

### 의도 잠금(Intention Locks)

InnoDB 엔진에서 구현된 다중 세분성 잠금(multiple granularity locking) 메커니즘은 행 레벨 잠금과 테이블 레벨 잠금을 용이하게 한다. 이 메커니즘은 `LOCK TABLES ... WRITE`와 같은 구문을 통해 지정된 테이블에 대한 배타적 잠금(X lock)을
설정할 수 있게 한다. 다중 세분성 잠금을 구현하기 위해 InnoDB는 의도 잠금이라는 테이블 레벨 잠금을 사용한다. 의도 잠금은 트랜잭션이 후에 테이블의 행에 대해 요구할 잠금 유형(공유 또는 배타적)을 나타내는 데 사용된다. 의도 잠금에는 의도 공유 잠금(IS)과 의도 배타 잠금(IX) 두 가지
유형이 있다.

IS 잠금은 트랜잭션이 테이블의 개별 행에 공유 잠금을 설정할 의도가 있음을 표시하며, IX 잠금은 배타적 잠금을 설정할 의도가 있음을 표시한다. 예를 들어, `SELECT ... FOR SHARE`는 IS 잠금을, `SELECT ... FOR UPDATE`는 IX 잠금을 설정한다.

의도 잠금 프로토콜에 따르면, 트랜잭션이 테이블의 행에 공유 잠금을 획득하기 전에 반드시 해당 테이블에 대해 IS 잠금 또는 그보다 강력한 잠금을 먼저 획득해야 한다. 또한 트랜잭션이 테이블의 행에 배타적 잠금을 획득하기 전에는 IX 잠금을 먼저 획득해야 한다.

### 잠금 호환성

데이터베이스 잠금은 여러 트랜잭션이 동시에 데이터에 접근할 때 일관성과 정합성을 유지하기 위해 사용된다. 잠금 호환성은 다음과 같다:

- 의도 공유 잠금(IS)은 다른 의도 공유 잠금(IS)과 호환된다.
- 의도 배타 잠금(IX)은 다른 의도 잠금(IS 또는 IX)과 호환된다.
- 실제 공유 잠금(S)은 다른 공유 잠금(S)과 호환된다.
- 실제 배타 잠금(X)은 다른 어떤 잠금과도 호환되지 않는다.

한 트랜잭션이 의도 배타 잠금(IX)을 가지고 있다면, 다른 트랜잭션이 의도 잠금을 획득하는 것을 방지하지 않지만, 실제 잠금으로의 전환은 제한할 수 있다.

|                          | Exclusive (X) | Intention Exclusive (IX) | Shared (S) | Intention Shared (IS) |
|--------------------------|:-------------:|:------------------------:|:----------:|:---------------------:|
| Exclusive (X)            |       X       |            X             |     X      |           X           |
| Intention Exclusive (IX) |       X       |            ✓             |     X      |           ✓           |
| Shared (S)               |       X       |            X             |     ✓      |           ✓           |
| Intention Shared (IS)    |       X       |            ✓             |     ✓      |           ✓           |

## InnoDB의 잠금

### Record Locks

레코드 잠금은 행(row)에 대한 잠금으로 인식되나, 실제로는 인덱스와 갭(gap)에 대한 잠금을 포함한다. 갭 잠금은 인덱스 키 값 사이의 범위에 대한 잠금을 의미한다.

넥스트-키 잠금은 레코드 잠금과 갭 잠금을 결합한 형태로, InnoDB에서 기본적으로 사용되는 잠금 유형이다. 이 잠금은 'S'(공유, shared) 또는 'X'(베타적, exclusive) 상태로 존재한다. 데이터 무결성을 유지하기 위해 가능한 한 적은 데이터에 잠금을 적용하는 것이 일반적이다.

레코드 또는 넥스트-키 잠금은 공유 또는 베타적 형태로 존재할 수 있다. 공유 잠금의 지속 기간은 트랜잭션 격리 수준에 따라 달라진다.

`X,REC_NOT_GAP` 잠금은 레코드에 대한 베타적 잠금을 나타내지만, 갭에 대한 잠금은 아니다. 즉, 해당 레코드는 변경할 수 없으나, 그 앞의 갭에 새로운 값이 삽입되는 것은 가능하다.

### Gap Locks

갭 잠금(Gap Lock)은 InnoDB 스토리지 엔진에서 두 레코드 사이의 갭을 잠그는 메커니즘으로, 클러스터 인덱스 또는 보조 인덱스에서 레코드 간의 공간을 잠그는 데 사용된다.

갭 잠금은 다른 트랜잭션이 해당 갭에 새로운 레코드를 삽입하는 것을 방지하여 데이터의 일관성을 유지하는 데 기여한다. 이는 특히 여러 트랜잭션이 동시에 수행될 때 중요하다.

갭 잠금의 주요 목적은 특정 범위에 대한 새로운 삽입을 방지하여 높은 격리 수준에서 발생할 수 있는 '팬텀 리드'를 방지하는 것이다.

'Busan' 에 사는 멤버를 갱신하는 UPDATE 쿼리 실행 상황을 고려해 보자. 해당 쿼리가 진행 중일 때 다른 트랜잭션이 해당 갭에 새로운 도시를 삽입하면, UPDATE 쿼리가 처리해야 할 대상이 누잠금될 위험이 있다.

이러한 상황을 방지하기 위해 갭 잠금이 사용될 때, 새로운 레코드의 삽입은 허용되지 않는다. 이는 UPDATE 쿼리가 실행 중일 때 해당 갭에 있는 데이터의 일관성이 유지됨을 보장한다. 즉, 갭 잠금은 해당 UPDATE 쿼리가 커밋되기 전까지는 새로운 레코드의 삽입을 방지한다.

결과적으로, 갭 잠금이 설정되면, 갭에 해당하는 새 데이터의 삽입이나 수정이 일시적으로 제한되어, 트랜잭션의 일관성과 격리 수준이 유지된다.

```SQL
## Connection 1
begin ;
select *
from MEMBER
WHERE city = 'busan' for share ;
```

```SQL
## Connection 2
select OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE, LOCK_DATA
from performance_schema.data_locks;

+---------------+-------------+-----------------+-----------+---------------+------------+
| OBJECT_SCHEMA | OBJECT_NAME | INDEX_NAME      | LOCK_TYPE | LOCK_MODE     | LOCK_DATA  |
+---------------+-------------+-----------------+-----------+---------------+------------+
| system_schm   | member      | NULL            | TABLE     | IS            | NULL       |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | S             | 'busan', 4 |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | S             | 'busan', 5 |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | S             | 'busan', 6 |
| system_schm   | member      | PRIMARY         | RECORD    | S,REC_NOT_GAP | 4          |
| system_schm   | member      | PRIMARY         | RECORD    | S,REC_NOT_GAP | 5          |
| system_schm   | member      | PRIMARY         | RECORD    | S,REC_NOT_GAP | 6          |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | S,GAP         | 'Seoul', 1 |
+---------------+-------------+-----------------+-----------+---------------+------------+
8 rows in set (0.01 sec)
```

- 1행 : 'member' 테이블 자체에 대한 Intent Shared(IS) 잠금이 걸려 있음을 나타낸다. 이것은 Connection 1이 해당 테이블의 데이터를 공유 모드로 읽기 위해 의도하고 있음을 의미한다.

- 2~4행 : `MEMBER_CITY_IDX` 인덱스를 사용하는 'busan'에 해당하는 레코드들에 대해서는 Shared(S) 잠금이 걸려 있다. 넥스트 키 잠금을 의미하며, 이전 레코드와 현재 레코드를 포함해서 잠금이 걸리게 된다.

- 5~7행 : PRIMARY 인덱스에 대해서는 `S,REC_NOT_GAP` 잠금이 걸려 있다. `REC_NOT_GAP`는 Record Not Gaplock의 약자로 갭락이 걸리지 않았다는 것을 의미한다. 즉 행 수준 잠금을 의미한다.

- 8행 : 'Seoul'에 해당하는 레코드에 대한 'S,GAP' 잠금이 걸려 있는데, ('busan',6) ~ ('Seoul', 1) 까지의 갭 잠금을 의미한다.

### Insert Intention Locks

삽입 의도 잠금은 INSERT 명령을 사용할 때 다른 트랜잭션이 새 레코드를 추가할 의도를 알리는 데 사용된다. 이 잠금은 실제 레코드에 대해서는 아니라 아직 생성되지 않은 레코드(갭)에 대해 설정된다.

### Auto Increament Locks

자동 증가 잠금은 여러 트랜잭션이 데이터를 삽입할 때 각각 고유한 값을 할당받을 수 있도록 하는 메커니즘이다. MySQL에서는 자동 증가 값을 관리하기 위해 다음과 같은 세 가지 잠금 모드를 지원하며, 이는 `innodb_autoinc_lock_mode` 옵션을 통해 설정 가능하다.

- 0 (traditional lock mode): MySQL 5.0 이전의 동작을 모방하는 모드다. 이 모드에서는 자동 증가 잠금이 문장의 마지막까지 유지되며, 값은 반복 가능하고 연속적인 순서대로 할당된다. 데이터의 일관성과 예측 가능성을 중시하는 상황에서 유용하다.

- 1 (consecutive lock mode): INSERT 문이 실행될 때 삽잠금입될 행의 수를 알고 있다면 필요한 자동 증가 값을 가벼운 뮤텍스 아래에서 할당하고 자동 증가 잠금을 회피할 수 있다. 삽입될 행의 수를 모르는 경우에는 자동 증가 잠금이 걸리고 문장의 끝까지 유지된다. 이
  모드는 MySQL 5.7 및 그 이전 버전에서 기본값으로 설정되어 있었다.

- 2 (interleaved lock mode): 자동 증가 잠금을 전혀 사용하지 않으며, 동시에 발생하는 삽입 작업으로 인해 자동 증가 값이 섞일 수 있다. 이 모드는 바이너리 로깅이 비활성화되었거나 binlog_format이 ROW로 설정된 경우에만 안전하다. MySQL 8에서는 이
  모드가 기본값으로 설정되어 있다.


## 트랜잭션과 잠금

여기서는 각 트랜잭션 격리 수준별로 잠금에 어떠한 영향을 미치는지 살펴본다. 예제를 위해 아래와 같은 스키마에서 테스트를 진행한다
```SQL
create table SYSTEM_SCHM.MEMBER
(
    id   bigint      not null,
    city varchar(36) not null,
    name varchar(36) not null,
    age  int         not null,
    primary key (id)
);


create index MEMBER_CITY_IDX
    on MEMBER (city);


insert into SYSTEM_SCHM.MEMBER(id, city, name, age)
values (1, 'Seoul', 'John', 30),
       (2, 'Seoul', 'Yun', 29),
       (3, 'Seoul', 'Merry', 28),
       (4, 'Busan', 'Hong', 28),
       (5, 'Busan', 'Kim', 25),
       (6, 'Busan', 'Merry', 21);
```

### Serializable

Serializable 격리 수준은 사용 가능한 격리 수준 중 가장 엄격하다.
SELECT 문을 포함한 모든 Statement은 잠금을 흭득한다. 단, autocommit이 활성화된 상태에서 실행되는 SELECT 문이나 명시적인 트랜잭션이 시작되지 않은 경우는 제외된다.

SELECT 문에 대해서는 FOR SHARE를 추가한 것과 동등한 효과를 낸다. 즉, SERIALIZABLE 격리 수준에서는 SELECT 문도 다른 트랜잭션에 의해 수정되지 않도록 잠금을 획득한다.
SERIALIZABLE 격리 수준은 데이터의 일관성을 최대한 보장하기 위해 많은 잠금을 사용하며, 이는 동시성 처리에 있어서 성능 저하를 일으킬 수 있다. 따라서, 필요한 경우에만 사용하는 것이 좋다.

아래는 Serializable 격리 수준에서 잠금이 어떻게 동작되는지를 보여준다.

```SQL
# Connection1
> SET transaction_isolation = 'SERIALIZABLE';
> BEGIN;
> SELECT * FROM MEMBER WHERE city = 'Busan';
```

```SQL
# Connection2
SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE,LOCK_STATUS,LOCK_DATA
FROM performance_schema.data_locks;
+---------------+-------------+-----------------+-----------+---------------+-------------+---------------------+
| OBJECT_SCHEMA | OBJECT_NAME | INDEX_NAME      | LOCK_TYPE | LOCK_MODE     | LOCK_STATUS | LOCK_DATA           |
+---------------+-------------+-----------------+-----------+---------------+-------------+---------------------+
| system_schm   | member      | NULL            | TABLE     | IS            | GRANTED     | NULL                |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | S             | GRANTED     | 'Busan', 4          |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | S             | GRANTED     | 'Busan', 5          |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | S             | GRANTED     | 'Busan', 6          |
| system_schm   | member      | PRIMARY         | RECORD    | S,REC_NOT_GAP | GRANTED     | 4                   |
| system_schm   | member      | PRIMARY         | RECORD    | S,REC_NOT_GAP | GRANTED     | 5                   |
| system_schm   | member      | PRIMARY         | RECORD    | S,REC_NOT_GAP | GRANTED     | 6                   |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | S,GAP         | GRANTED     | 'Seoul', 1          |
+---------------+-------------+-----------------+-----------+---------------+-------------+---------------------+
```

`MEMBER_CITY_IDX` 로 읽는 모든 인덱스 레코드에 넥스트 키 잠금이 걸리고 기본키에는 행 수준 잠금을 걸게된다. 'Busan'에 대한 마지막 인덱스 뒤인 (Seoul, 'John', 1) 레코드에 갭잠금이 걸리는것을 볼 수 있다.
Serializable 격리 수준에서는 넥스트 키잠금과 갭잠금에 S잠금이 걸려 Phantom Read를 예방할 수 있다.

아래는 MEMBER 테이블의 Primary Key로 유니크한 레코드를 SELECT 할 때 획득되는 잠금을 나타낸다.

```SQL
# Connection 1
> SET transaction_isolation = 'SERIALIZABLE';
> BEGIN;
> SELECT * FROM MEMBER WHERE id = 1;
```

```SQL
# Connection 2 
> SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE,LOCK_STATUS,LOCK_DATA FROM performance_schema.data_locks;
+---------------+-------------+------------+-----------+---------------+-------------+-----------+
| OBJECT_SCHEMA | OBJECT_NAME | INDEX_NAME | LOCK_TYPE | LOCK_MODE     | LOCK_STATUS | LOCK_DATA |
+---------------+-------------+------------+-----------+---------------+-------------+-----------+
| system_schm   | member      | NULL       | TABLE     | IS            | GRANTED     | NULL      |
| system_schm   | member      | PRIMARY    | RECORD    | S,REC_NOT_GAP | GRANTED     | 1         |
+---------------+-------------+------------+-----------+---------------+-------------+-----------+
2 rows in set (0.01 sec)
```

Primary Key는 WHERE 조건에 맞는 레코드가 1건인 것을 보장하므로 Primary Record에 행 수준 잠금`(S,REC_NOT_GAP)`을 획득하는 것을 볼 수 있다.

아래는 `MEMBER_CITY_IDX` 인덱스의 하위 집합을 UPDATE 할 때 발생하는 잠금을 나타낸다.

```SQL
# Connection 1
> SET transaction_isolation = 'SERIALIZABLE';
> BEGIN;
> UPDATE MEMBER SET AGE = AGE + 1 WHERE city='Busan' and name = 'Hong';
```

```SQL
# Connection 2
> SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE,LOCK_STATUS,LOCK_DATA FROM performance_schema.data_locks;
+---------------+-------------+-----------------+-----------+---------------+-------------+------------+
| OBJECT_SCHEMA | OBJECT_NAME | INDEX_NAME      | LOCK_TYPE | LOCK_MODE     | LOCK_STATUS | LOCK_DATA  |
+---------------+-------------+-----------------+-----------+---------------+-------------+------------+
| system_schm   | member      | NULL            | TABLE     | IX            | GRANTED     | NULL       |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | X             | GRANTED     | 'Busan', 4 |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | X             | GRANTED     | 'Busan', 5 |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | X             | GRANTED     | 'Busan', 6 |
| system_schm   | member      | PRIMARY         | RECORD    | X,REC_NOT_GAP | GRANTED     | 4          |
| system_schm   | member      | PRIMARY         | RECORD    | X,REC_NOT_GAP | GRANTED     | 5          |
| system_schm   | member      | PRIMARY         | RECORD    | X,REC_NOT_GAP | GRANTED     | 6          |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | X,GAP         | GRANTED     | 'Seoul', 1 |
+---------------+-------------+-----------------+-----------+---------------+-------------+------------+
8 rows in set (0.01 sec)
```
`MEMBER_CITY_IDX` 인덱스에 name에 대한 인덱스가 없기 때문에 city='Busan' 영역에 넥스트 키락과 갭락이 걸리는 것을 확인할 수 있다.

### Repeatable Read

Repeatable Read 격리 수준은 InnoDB에서 기본으로 설정된 격리 수준이다.
이 수준에서 SELECT 쿼리는 특정 시점의 데이터베이스 상태를 반영하는 스냅샷을 통해 구현된다.
이 스냅샷은 트랜잭션이 시작될 때 또는 트랜잭션 내에서 첫 번째 SQL 문장이 실행될 때 생성된다.
InnoDB는 Multi-Version Concurrency Control(MVCC)을 사용하여 스냅샷을 제공하한다.

아래 예시는 Repeatable Read 격리 수준에서 스냅샷 읽기를 사용한 읽관된 읽기과 잠금을 보여준다.

```SQL
# Connection1
> SET transaction_isolation = 'REPEATABLE-READ';
> BEGIN;
> SELECT * FROM MEMBER WHERE city = 'Busan';
+----+-------+-------+-----+
| id | city  | name  | age |
+----+-------+-------+-----+
|  4 | Busan | Hong  |  29 |
|  5 | Busan | Kim   |  26 |
|  6 | Busan | Merry |  22 |
+----+-------+-------+-----+
3 rows in set (0.01 sec)
```

```SQL
# Connection 2
> SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE,LOCK_STATUS,LOCK_DATA
  FROM performance_schema.data_locks;
Empty set (0.00 sec)
```

```SQL
# Connection 3
> INSERT INTO SYSTEM_SCHM.MEMBER(id, city, name, age) VALUES (7, 'Busan', 'July', 22);
Query OK, 1 row affected (0.02 sec)
```

```SQL
# Connection 1
> SELECT * FROM MEMBER WHERE city = 'Busan';
+----+-------+-------+-----+
| id | city  | name  | age |
+----+-------+-------+-----+
|  4 | Busan | Hong  |  29 |
|  5 | Busan | Kim   |  26 |
|  6 | Busan | Merry |  22 |
+----+-------+-------+-----+
3 rows in set (0.01 sec)
```
이 케이스에서 SELECT 시, 공유잠금이 유지되지 않는데 이것이 Serializable과 Repeatable Read의 가장 중요한 차이이다.
Connection3에서 MEMBER 테이블에 새로운 레코드를 Insert를 하더라도, Connection1 에서 다시 SELECT를 해도 새로 추가된 레코드가 나타나지 않는 것을 볼 수 있다.
이는 스냅샷 읽기를 사용해서 트랜잭션이 데이터를 읽는 동안 다른 트랜잭션이 해당 테이블을 수정해도, 최초 트랜잭션은 원래의 데이터 상태를 계속 볼 수 있기 때문이다.

MySQL의 Repeatable Read 격리 수준의 잘못 알려진 사실은, MySQL의 Repeatable Read 격리 수준에서는 MVCC를 통해 Phantom Read 현상이 발생하지 않는다는 것 이다.
MVCC는 스냅샷 읽기를 통해 읽기 작업의 동시성을 높히기 위한 것으로, UPDATE나 DELETE 문에는 적용되지 않는다.
즉, 최초 트랜잭션에서 스냅샷에서 데이터를 읽은 후, 다른 트랜잭션에서 첫번째 트랜잭션에서 사용된 필터와 일치하는 행의 변경사항을 커밋하면 첫 번째 트랜잭션에서 이 행을 수정할 수 있고, 이후에는 스냅샷에 포함될 수 있다.

아래는 Repeatable Read 격리 수준에서 발생할 수 있는 Phantom Read의 예를 보여준다.
```SQL
# Connection 1
> SET transaction_isolation = 'REPEATABLE-READ';
> BEGIN;
> SELECT * FROM MEMBER WHERE city = 'Busan';
+----+-------+-------+-----+
| id | city  | name  | age |
+----+-------+-------+-----+
|  4 | Busan | Hong  |  29 |
|  5 | Busan | Kim   |  26 |
|  6 | Busan | Merry |  22 |
+----+-------+-------+-----+
3 rows in set (0.01 sec)
```

```SQL
# Connection 2
> INSERT INTO SYSTEM_SCHM.MEMBER(id, city, name, age) VALUES (7, 'Busan', 'July', 22);
Query OK, 1 row affected (0.02 sec)
```

```SQL
# Connection 1
> UPDATE MEMBER SET AGE = AGE + 1 WHERE  city = 'Busan';
Query OK, 4 rows affected (0.02 sec)
Rows matched: 4  Changed: 4  Warnings: 0

> SELECT * FROM MEMBER WHERE city = 'Busan';
+----+-------+-------+-----+
| id | city  | name  | age |
+----+-------+-------+-----+
|  4 | Busan | Hong  |  30 |
|  8 | Busan | July  |  23 |
|  5 | Busan | Kim   |  27 |
|  6 | Busan | Merry |  23 |
+----+-------+-------+-----+
4 rows in set (0.02 sec)
```

Connection1 에서는 도시가 부산인 모든 멤버(city='Busan')를 쿼리한다. 그런 다음 Connection2는 'Busan'에 새로운 멤버를 추가 후 커밋한다.
여기까지는 Connection1이 SELECT 문을 반복해도 똑같은 멤버가 반환된다. 그러나 Connection1에서 Busan의 모든 멤버에 대해 UPDATE하면
4개 행이 업데이트되고 추가 SELECT에서도 4개행의 반환되는 것을 확인할 수 있다.

Phantom read를 막기 위해서는 Connection1에서 FOR SHARE 절을 사용하여 공유잠금을 요청하거나 Serializable 격리 수준으로 변경해야한다.

마지막으로, 아래는 REPEATABLE-READ 격리 수준에서 `MEMBER_CITY_IDX` 인덱덱의 하위 집합을 UPDATE 할 때 발생하는 잠금을 나타낸다.

```SQL
# Connection 1
> SET transaction_isolation = 'REPEATABLE';
> BEGIN;
> UPDATE MEMBER SET AGE = AGE + 1 WHERE city='Busan' and name = 'Hong';
```
```SQL
# Connection 2
> SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE,LOCK_STATUS,LOCK_DATA FROM performance_schema.data_locks;
+---------------+-------------+-----------------+-----------+---------------+-------------+------------+
| OBJECT_SCHEMA | OBJECT_NAME | INDEX_NAME      | LOCK_TYPE | LOCK_MODE     | LOCK_STATUS | LOCK_DATA  |
+---------------+-------------+-----------------+-----------+---------------+-------------+------------+
| system_schm   | member      | NULL            | TABLE     | IX            | GRANTED     | NULL       |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | X             | GRANTED     | 'Busan', 4 |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | X             | GRANTED     | 'Busan', 5 |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | X             | GRANTED     | 'Busan', 6 |
| system_schm   | member      | PRIMARY         | RECORD    | X,REC_NOT_GAP | GRANTED     | 4          |
| system_schm   | member      | PRIMARY         | RECORD    | X,REC_NOT_GAP | GRANTED     | 5          |
| system_schm   | member      | PRIMARY         | RECORD    | X,REC_NOT_GAP | GRANTED     | 6          |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | X,GAP         | GRANTED     | 'Seoul', 1 |
+---------------+-------------+-----------------+-----------+---------------+-------------+------------+
8 rows in set (0.01 sec)
```
Serializable 격리 수준과 동일한 수준의 8개의 잠금을 확인할 수 있다.


### Read Committed
Read Committed와 Repeatable Read의 주요 차이점은 일관된 읽기를 지원하지 않는 다는 것이다.
이는 스냅샷 사용을 하지 않기 때문에, 오래된 undo 로그를 더 빨리 정리할 수 있게 하는데, 특히 오랜시간 동안 실행되는 Long 트랜잭션에서 중요하다.

또한, Read Committed에서는 외래 키와 고유 키 제약 조건을 확인하는 경우, 그리고 페이지 분할이 발생하는 경우에만 갭 잠금을 사용한다.
페이지 분할은 InnoDB 페이지가 거의 가득 찼을 때 중간에 레코드를 삽입하거나 기존 레코드가 커져서 페이지에 더 이상 공간이 없을 때 발생한다.

아래는 Read Committed에서 발생할 수 있는 non-Repeatable Read 문제를 보여준다.
```SQL
# Connection 1
> SET transaction_isolation = 'READ-COMMITTED';
> BEGIN;
> SELECT * FROM MEMBER WHERE city = 'Busan';
+----+-------+-------+-----+
| id | city  | name  | age |
+----+-------+-------+-----+
|  4 | Busan | Hong  |  28 |
|  5 | Busan | Kim   |  25 |
|  6 | Busan | Merry |  21 |
+----+-------+-------+-----+
3 rows in set (0.02 sec)
```
```SQL
# Connection 2
> BEGIN;
> UPDATE MEMBER SET age = 30 WHERE city = 'Busan';
> COMMIT;
```
```SQL
# Connection 1
> SELECT * FROM MEMBER WHERE city = 'Busan';
+----+-------+-------+-----+
| id | city  | name  | age |
+----+-------+-------+-----+
|  4 | Busan | Hong  |  30 |
|  5 | Busan | Kim   |  30 |
|  6 | Busan | Merry |  30 |
+----+-------+-------+-----+
3 rows in set (0.01 sec)
```
Connection2에서 city=Busan에 해당 하는 모든 멤버의 나이를 30으로 UPDATE를 하고 커밋한 뒤, Connection1에서 SELECT 하면 마지막 커밋의 레코드를 읽어오는 것을 확인할 수 있다.
이 격리 수준에서는 non-Repeatable Read 문제와 Phantom Read 현상이 발생할 수 있다.

또, 다른 특징으로는 WHERE 절에 따라 어떤 레코드가 해당 쿼리에 영향을 받는지 결정할 때, 이 레코드들에 잠금이 걸리게 된다.
그러나 Read Committed 격리 수준에서는 잠금이 걸린 레코드 중에서 실제로 수정되지 않는 레코드들에 대한 잠금은 WHERE 절의 평가가 끝나는 즉시 해재된다.

아래는 Read Committed 격리 수준에서 `MEMBER_CITY_IDX` 인덱덱의 하위 집합을 UPDATE 할 때 발생하는 잠금을 나타낸다.
```SQL
# Connection 1
> SET transaction_isolation = 'READ-COMMITTED';
> BEGIN;
> UPDATE MEMBER SET AGE = AGE + 1 WHERE city='Busan' and name = 'Hong';
```
```SQL
# Connection 2
> SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE,LOCK_STATUS,LOCK_DATA FROM performance_schema.data_locks;
+---------------+-------------+-----------------+-----------+---------------+-------------+------------+
| OBJECT_SCHEMA | OBJECT_NAME | INDEX_NAME      | LOCK_TYPE | LOCK_MODE     | LOCK_STATUS | LOCK_DATA  |
+---------------+-------------+-----------------+-----------+---------------+-------------+------------+
| system_schm   | member      | NULL            | TABLE     | IX            | GRANTED     | NULL       |
| system_schm   | member      | MEMBER_CITY_IDX | RECORD    | X,REC_NOT_GAP | GRANTED     | 'Busan', 4 |
| system_schm   | member      | PRIMARY         | RECORD    | X,REC_NOT_GAP | GRANTED     | 4          |
+---------------+-------------+-----------------+-----------+---------------+-------------+------------+
3 rows in set (0.01 sec)
```
Read Committed 격리 수준에서는 `city='Busan' and name = 'Hong'` 조건을 만족하는 레코드 2건(인덱스와 PK)에 대해서만 행 수준 잠금이 걸려있는 것을 확인할 수 있다.
실제로는 Repeatable Read 격리 수준과 마찬가지로 city='Busan'에 해당하는 레코드 모두에 대해서 잠금을 걸지만, WHERE 조건에 평가가 끝나는 즉시 잠금을 회수하기 때문에 이러한 잠금은 관측하기가 어렵다.

Read Committed 격리 수준의 또 다른 특징은 semi-consistent read다.
semi-consistent read는 인덱스가 없는 열에서 동작하며 어떤 Statement가 실행될 때 행의 마지막 커밋된 값과 WHERE 절을 비교하여
해당 Statement가 특정 행을 업데이트하지 않을 것으로 판단되면, 다른 트랜잭션이 해당 행에 잠금을 걸고 있어도 잠금 충돌이 발생하지 않는다.

아래는 semi-consistent read 예를 보여준다.
```SQL
# Connection 1
> SET transaction_isolation = 'READ-COMMITTED';
> BEGIN;
> UPDATE MEMBER SET AGE = AGE + 1 WHERE  name = 'Hong';
```
```SQL
# Connection 2
> SET transaction_isolation = 'READ-COMMITTED';
> BEGIN;
> UPDATE MEMBER SET AGE = AGE + 1 WHERE  name = 'Kim';
```
```SQL
# Connection 3
> SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE,LOCK_STATUS,LOCK_DATA FROM performance_schema.data_locks;
+---------------+-------------+------------+-----------+---------------+-------------+-----------+
| OBJECT_SCHEMA | OBJECT_NAME | INDEX_NAME | LOCK_TYPE | LOCK_MODE     | LOCK_STATUS | LOCK_DATA |
+---------------+-------------+------------+-----------+---------------+-------------+-----------+
| system_schm   | member      | NULL       | TABLE     | IX            | GRANTED     | NULL      |
| system_schm   | member      | PRIMARY    | RECORD    | X,REC_NOT_GAP | GRANTED     | 5         |
| system_schm   | member      | NULL       | TABLE     | IX            | GRANTED     | NULL      |
| system_schm   | member      | PRIMARY    | RECORD    | X,REC_NOT_GAP | GRANTED     | 4         |
+---------------+-------------+------------+-----------+---------------+-------------+-----------+
4 rows in set (0.02 sec)
```
두 트랜젹선 모두 WHERE절에서 name을 비교하지만 Hong, Kim 서로 다른 레코드를 업데이트한다.
name은 인덱싱되어 있지 않아 semi-consistent read로 잠금 충돌이 발생하지 않는다.


### Read Uncommitted
Read Uncommitted 격리 수준을 사용하는 트랜잭션은 아직 커밋되지 않은 데이터를 읽을 수 있으며, 이를 더티 리드(dirty read)라고 한다.
더티 리드를 제외하고는 동작은 READ COMMITTED와 동일하다. 주요 용도는 대략적인 값만 필요한 경우이다.

