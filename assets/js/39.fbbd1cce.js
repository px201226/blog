(window.webpackJsonp=window.webpackJsonp||[]).push([[39],{447:function(a,e,t){"use strict";t.r(e);var n=t(21),_=Object(n.a)({},(function(){var a=this,e=a.$createElement,t=a._self._c||e;return t("ContentSlotsDistributor",{attrs:{"slot-key":a.$parent.slotKey}},[t("h2",{attrs:{id:"message-delivery-semantics"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#message-delivery-semantics"}},[a._v("#")]),a._v(" Message Delivery Semantics")]),a._v(" "),t("p",[a._v("분산형 Pub/Sub 메시징 시스템에서는 컴퓨터들이 독립적으로 장애를 일으킬 수 있다.\n예를 들어, 카프카는 개별 브로커 충돌이나 프로듀서가 메시지를 보내는 동안 네트워크 장애로 인해 문제가 발생할 수 있다.\n이러한 장애를 처리하기 위해 프로듀서가 취하는 조치에 따라 다른 의미가 있다.")]),a._v(" "),t("ul",[t("li",[t("p",[a._v("At most once: 생산자가 Kafka 브로커로부터 확인(ack)을 수신하고 acks=all인 경우, 이는 메시지가 Kafka 토픽에 정확히 한 번 쓰여진 것을 의미한다.\n그러나 프로듀서가 시간 초과되거나 오류를 수신하면 메시지가 카프카 토픽에 쓰여지지 않았다고 가정하고 메시지 전송을 다시 시도할 수 있다.\n이로 인해 브로커가 응답을 보내기 직전에 실패했을 경우, 메시지가 이미 성공적으로 쓰여졌음에도 불구하고 메시지가 두 번 쓰여져서 최종 소비자에게 중복 전달될 수 있다.")])]),a._v(" "),t("li",[t("p",[a._v("At least once: 생산자가 시간 초과나 오류를 반환할 때 재시도하지 않으면 메시지가 카프카 토픽에 기록되지 않아 소비자에게 전달되지 않을 수 있다.\n대부분의 경우 메시지는 전달되지만, 때때로 중복 전달을 피하기 위해 일부 메시지는 전달되지 않을 수도 있다.")])]),a._v(" "),t("li",[t("p",[a._v("Exactly once: 이 경우 생산자가 메시지 전송을 다시 시도하더라도 최종적으로 메시지는 소비자에게 정확히 한 번만 전달된다.\n이 접근 방식은 가장 바람직한 방법이지만 이해하기 어렵다. 이는 메시징 시스템과 애플리케이션 간의 협력이 필요하기 때문이다.\n예를 들어, 메시지를 소비한 후에 카프카 소비자를 이전 오프셋으로 되돌리면 해당 오프셋에서 최신 메시지까지 모든 메시지를 다시 수신하게 된다.\n이렇게 하면 메시징 시스템과 클라이언트 애플리케이션이 협력하여 정확히 한 번만 메시지가 발생하도록 보장해야 한다.\n")])])]),a._v(" "),t("h2",{attrs:{id:"exactly-once-의-어려움"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#exactly-once-의-어려움"}},[a._v("#")]),a._v(" Exactly once 의 어려움")]),a._v(" "),t("p",[a._v("한 개의 프로세스로 동작하는 생산자 소프트웨어 애플리케이션이 'Hello Kafka'라는 단일 파티션 카프카 토픽에 'EoS'라는 메시지를 보낸다.\n이 메시지를 수신하기 위해 반대편에 위치한 단일 인스턴스 소비자 애플리케이션이 동작한다.\n이상적인 경우에는 잘 작동하여 'Hello Kafka' 메시지가 EoS 토픽 파티션에 한 번만 기록된다.\n소비자는 메시지를 가져와서 처리를 완료한 후 메시지 오프셋을 커밋하여 처리를 완료했음을 알린다.\n또한, 소비자 애플리케이션이 실패하고 다시 시작해도 같은 메시지를 중복 수신하지 않는다.")]),a._v(" "),t("p",[a._v("그러나 현실적으로 예상치 못한 실패 시나리오가 항상 발생할 수 있다.")]),a._v(" "),t("ul",[t("li",[t("p",[a._v("브로커는 실패: Kafka는 고가용성, 지속성, 내구성이 뛰어난 시스템으로, 파티션에 기록된 모든 메시지는 일정 횟수 동안 지속 및 복제된다.\n이로 인해 Kafka는 n-1 브로커 장애를 견딜 수 있으며, 적어도 하나 이상의 사용 가능한 브로커가 있으면 파티션을 사용할 수 있다.\n카프카의 복제 프로토콜은 메시지가 리더 복제본에 성공적으로 쓰여질 경우 사용 가능한 모든 복제본에 복제되도록 보장한다.")])]),a._v(" "),t("li",[t("p",[a._v("생산자-브로커 간 RPC는 실패: Kafka의 내구성은 브로커로부터 응답을 받는 프로듀서에 따라 달라진다.\n응답을 받지 못했다고 해서 요청 자체가 실패한 것은 아니다.\n브로커는 메시지를 작성한 후 생산자에게 응답을 보내기 전에 충돌할 수 있다.\n또한 토픽에 메시지를 작성하기 전에 크래시될 수도 있다.\n생산자는 실패의 원인을 알 수 없기 때문에 메시지가 성공적으로 작성되지 않았다고 가정하고 재시도할 수 있다.\n때로는 동일한 메시지가 카프카 파티션 로그에 중복되어 최종 소비자가 두 번 이상 수신하는 경우가 생길 수 있다.")])]),a._v(" "),t("li",[t("p",[a._v("클라이언트가 실패: 한 번만 메시지를 전송하려면 클라이언트 장애도 고려해야 된다.\n그러나 클라이언트가 브로커에서 일시적으로 파티셔닝되거나 애플리케이션이 일시 중지된 것인지, 아니면 실제로 실패한 것인지를 어떻게 알 수 있을까?\n영구적인 장애와 일시적인 장애를 구분하는 것이 중요하며, 브로커는 '좀비' 생산자가 보낸 메시지를 삭제해야 한다.\n새로운 클라이언트 인스턴스가 시작될 때 실패한 인스턴스가 남긴 상태로부터 복구하여 안전한 지점부터 처리를 시작할 수 있어야 한다.\n즉, 소비된 오프셋은 항상 생산된 출력과 동기화 상태를 유지해야 한다.")])])]),a._v(" "),t("h3",{attrs:{id:"멱등성-파티션당-exactly-once-의미론"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#멱등성-파티션당-exactly-once-의미론"}},[a._v("#")]),a._v(" 멱등성: 파티션당 Exactly once 의미론")]),a._v(" "),t("ul",[t("li",[a._v('"enable.idempotence=true" 옵션을 사용하면, 비동작 연산을 여러 번 수행해도 동일한 결과를 보장한다.')]),a._v(" "),t("li",[a._v("프로듀서 보내기 연산이 비활성화되어도, 오류로 인해 생산자가 메시지를 재시도하는 경우에도 브로커의 Kafka 로그에는 동일한 메시지가 한 번만 기록된다.")]),a._v(" "),t("li",[a._v("단일 파티션의 경우, 멱등한 프로듀서가 메시지를 보내면 프로듀서나 브로커 오류로 인해 메시지가 중복되는 가능성이 없어진다.")]),a._v(" "),t("li",[a._v("이 기능을 사용하여 파티션당 정확히 한 번만 시맨틱을 전송하므로 중복과 데이터 손실 없이 메시지를 순서대로 전송할 수 있다.")])]),a._v(" "),t("p",[a._v("이 기능은 TCP와 유사한 방식으로 작동하며, Kafka로 전송되는 각 메시지 배치에는 중복 전송을 제거하는 데 사용되는 시퀀스 번호가 포함된다.\n이 시퀀스 번호는 복제된 로그에 유지되어 리더가 실패해도 인계받은 모든 브로커가 재전송이 중복 전송인지 여부를 파악할 수 있다.\n이 메커니즘은은 각 메시지 배치에 숫자 필드 몇 개만 추가하면 되기 때문에 성능 오버헤드가 매우 낮다.")]),a._v(" "),t("blockquote",[t("p",[a._v("각 새로운 생산자는 초기화 과정에서 고유한 PID가 할당된다. PID 할당은 사용자에게 완전히 투명하며, 클라이언트에서 노출되지 않는다.\n특정 PID에 대해 시퀀스 번호는 0부터 시작하여 Topic Partition당 하나씩 모노토닉하게 증가된다.")]),a._v(" "),t("p",[a._v("생산자가 보내는 각 메시지마다 시퀀스 번호가 증가한다. 마찬가지로, 브로커는 해당 Topic Partition에 대해 커밋하는 각 메시지마다 PID -> Topic Partition 쌍에 연결된 시퀀스 번호를 증가시킨다.\n마지막으로, 브로커는 PID -> 토픽 파티션 쌍에서 마지막으로 커밋된 메시지보다 시퀀스 번호가 정확히 하나 크지 않은 경우 프로듀서로부터의 메시지를 거부한다.")]),a._v(" "),t("p",[a._v("이를 통해 생산자가 실패 시 요청을 다시 시도해야 할 수 있지만, 모든 메시지가 로그에 정확히 한 번만 지속되도록 보장된다.\n또한, 각 새로운 생산자 인스턴스에는 새로운 고유한 PID가 할당되므로 한 번의 생산 세션 내에서만 멱등한 생산을 보장할 수 있다.")])]),a._v(" "),t("h2",{attrs:{id:"kafka의-트랜잭션"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#kafka의-트랜잭션"}},[a._v("#")]),a._v(" Kafka의 트랜잭션")]),a._v(" "),t("p",[a._v("Kafka는 트랜잭션 API를 통해 여러 파티션에 걸친 트랜잭션 연산을 지원한다.\n이를 통해 생산자는 메시지 배치를 여러 파티션에 전송하여 모든 메시지가 최종적으로 모든 소비자에게 표시되거나 아예 표시되지 않도록 할 수 있다.\n또한 이 기능을 사용하면 처리한 데이터와 함께 동일한 트랜잭션에서 소비자 오프셋을 커밋할 수 있어 엔드투엔드로 정확히 한 번만 메시지를 전달할 수 있다.")]),a._v(" "),t("p",[a._v("소비자 측에서는 격리 수준 소비자 구성을 통해 표현되는 트랜잭션 메시지를 읽는 두 가지 옵션이 있다.")]),a._v(" "),t("p",[a._v("read_committed: 트랜잭션의 일부가 아닌 메시지를 읽는 것 외에도 트랜잭션이 커밋된 후 트랜잭션의 일부인 메시지를 읽을 수도 있다.\nread_uncommitted: 트랜잭션이 커밋될 때까지 기다리지 않고 오프셋 순서대로 모든 메시지를 읽는다.\n트랜잭션을 사용하려면, 올바른 격리 수준을 사용하도록 소비자를 구성하고, 새로운 생산자 API를 사용하고, 생산자 구성 트랜잭션.id를 고유 ID로 설정해야 한다.\n이 고유 ID는 애플리케이션 재시작 시 트랜잭션 상태의 연속성을 제공하는 데 필요하다.")]),a._v(" "),t("h2",{attrs:{id:"kafka의-정확히-한-번-스트림-처리"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#kafka의-정확히-한-번-스트림-처리"}},[a._v("#")]),a._v(" Kafka의 정확히 한 번 스트림 처리")]),a._v(" "),t("p",[a._v('스트림 애플리케이션에서 정확히 한 번의 시맨틱을 보장하려면 "processing.guarantee=exactly_once" 구성을 설정하면 된다.\n이렇게 하면 모든 처리 작업과 해당 작업에서 생성된 모든 구체화된 상태가 Kafka에 정확히 한 번만 기록된다.')]),a._v(" "),t("p",[a._v("그러나 정확히 한 번의 의미론은 Kafka 스트림의 내부 처리 범위에서만 보장된다.\n예를 들어, 스트림으로 작성된 이벤트 스트리밍 앱이 원격 저장소를 업데이트하기 위해 RPC 호출을 수행하거나 사용자 정의 클라이언트를 사용하여 카프카 토픽을 직접 읽거나 쓰는 경우, 이러한 외부 요소에 의한 부작용은 정확히 한 번 보장되지 않을 수 있다.")]),a._v(" "),t("blockquote",[t("p",[a._v("이것이 바로 Kafka의 Streams API가 제공하는 정확히 한 번 보장이 지금까지 모든 스트림 처리 시스템이 제공한 가장 강력한 보장인 이유입니다. Kafka에서 읽은 데이터, Streams 앱에 의해 Kafka로 구체화된 모든 상태에서 Kafka에 다시 기록된 최종 출력으로 확장되는 스트림 처리 애플리케이션에 대해 종단 간 정확히 한 번 보장을 제공합니다. 상태를 구체화하기 위해 외부 데이터 시스템에만 의존하는 스트림 처리 시스템은 정확히 한 번 스트림 처리에 대한 약한 보장을 지원합니다. 스트림 처리를 위한 소스로 Kafka를 사용하고 오류를 복구해야 하는 경우에도 메시지를 다시 사용하고 재처리하기 위해 Kafka 오프셋을 되감기만 할 수 있지만 외부 시스템에서 연결된 상태를 롤백할 수 없으므로 상태 업데이트가 멱등성이 아닌 경우 잘못된 결과가 발생합니다.")])]),a._v(" "),t("p",[a._v('스트림 처리 시스템의 핵심 질문은 "처리 도중에 인스턴스 중 하나가 충돌하더라도 스트림 처리 애플리케이션이 올바른 결과를 얻을 수 있는가?" 이다.\n이를 위해 스트림 처리는 카프카 토픽에서 읽기, 처리 및 쓰기 작업으로 이루어진다.\n소비자가 카프카 토픽에서 메시지를 읽어와서 처리 로직에 의해 변환하거나 상태를 수정한 후, 생산자가 결과 메시지를 다른 카프카 토픽에 기록한다.\n정확히 한 번 스트림 처리는 이러한 작업들을 정확히 한 번만 실행하는 기능을 의미한다.\n이것은 입력 메시지의 누락이나 중복된 출력이 발생하지 않도록 하는 것을 의미한다.\n이는 사용자가 스트림 프로세서에 정확히 한 번만 실행되는 동작을 기대하는 것이다.')]),a._v(" "),t("p",[a._v("이것 외에도 고려해야 할 다른 많은 실패 시나리오가 있다.")]),a._v(" "),t("ul",[t("li",[a._v("스트림 프로세서는 여러 소스 토픽에서 입력을 받을 수 있으며, 이러한 소스 토픽의 순서는 여러 번 실행할 때 결정적이지 않다. 따라서 여러 소스 토픽에서 입력을 받는 스트림 프로세서를 다시 실행하면 다른 결과가 나올 수 있다..")]),a._v(" "),t("li",[a._v("마찬가지로 스트림 프로세서는 여러 대상 토픽에 대한 출력을 생성할 수 있다. 프로듀서가 여러 토픽에 걸쳐 원자 쓰기를 수행할 수 없는 경우 일부(전부는 아님) 파티션에 대한 쓰기가 실패하면 프로듀서 출력이 올바르지 않을 수 있다.")]),a._v(" "),t("li",[a._v("스트림 프로세서는 스트림 API가 제공하는 관리 상태 기능을 사용하여 여러 입력에 걸쳐 데이터를 집계하거나 조인할 수 있다. 스트림 프로세서의 인스턴스 중 하나에 장애가 발생하면 해당 스트림 프로세서 인스턴스에서 구현된 상태를 롤백할 수 있어야 한다. 인스턴스를 다시 시작할 때 처리를 재개하고 해당 상태를 다시 생성할 수 있어야 한다.")]),a._v(" "),t("li",[a._v("스트림 프로세서는 외부 데이터베이스에서 보강 정보를 조회하거나 대역 외로 업데이트되는 서비스를 호출할 수 있다. 외부 서비스에 의존하면 스트림 프로세서는 근본적으로 비결정적이기 때문에 스트림 프로세서가 두 번 실행되는 사이에 외부 서비스가 내부 상태를 변경하면 다운스트림에서 잘못된 결과를 초래할 수 있다.")])]),a._v(" "),t("p",[a._v('특히 비결정적 연산 및 애플리케이션에서 계산된 영구 상태의 변경과 함께 실패 및 재시작이 발생하면 중복뿐만 아니라 잘못된 결과도 발생할 수 있다.\n예를 들어, 한 처리 단계에서 표시된 이벤트 수를 계산하는 경우, 업스트림 처리 단계에서 중복이 발생하면 다운스트림에서 잘못된 카운트가 발생할 수 있습니다. 따라서 "정확히 한 번만 스트림 처리"라는 문구를 한정해야 합니다. 이는 토픽에서 소비하고, 카프카 토픽에서 중간 상태를 구체화하여 하나로 생성하는 것을 의미하지만, 메시지에서 수행되는 모든 가능한 계산이 스트림 API를 사용하는 것은 아니다.\n일부 계산(예: 외부 서비스에 의존하거나 여러 소스 토픽에서 소비하는 경우)은 근본적으로 비결정적이다.')]),a._v(" "),t("blockquote",[t("p",[a._v('"결정론적 연산에 대한 정확한 한 번 스트림 처리 보장을 생각하는 올바른 방법은 읽기-처리-쓰기 작업의 출력이 스트림 프로세서가 각 메시지를 정확히 한 번만 볼 때와 동일한지, 즉 오류가 발생하지 않은 경우와 동일한지를 보장하는 것입니다.”')])]),a._v(" "),t("h2",{attrs:{id:"비결정적-연산에서-정확히-한-번이란"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#비결정적-연산에서-정확히-한-번이란"}},[a._v("#")]),a._v(" 비결정적 연산에서 정확히 한 번이란?")]),a._v(" "),t("p",[a._v("예를 들어, 들어오는 이벤트의 실행 카운트를 유지하는 동일한 스트림 프로세서가 외부 서비스에서 지정한 조건을 만족하는 이벤트만 카운트하도록 수정되었다고 가정해 봅자.\n기본적으로 이 작업은 외부 조건이 스트림 프로세서를 두 번 실행하는 사이에 변경되어 다운스트림에서 다른 결과를 초래할 수 있기 때문에 본질적으로 결정론적이지 않다.\n그렇다면 이와 같은 결정론적이지 않은 연산에 대한 정확한 1회 보장은 어떻게 생각하는 것이 좋을까?")]),a._v(" "),t("p",[a._v('"결정론적이지 않은 연산에 대한 정확한 1회 보장을 생각하는 올바른 방법은 읽기-처리-쓰기 스트림 처리 작업의 출력이 결정론적이지 않은 입력의 합법적 값 조합에 의해 생성되는 합법적 출력의 하위 집합에 속하도록 하는 것이다"')]),a._v(" "),t("p",[a._v("따라서 위의 예제 스트림 프로세서의 경우, 현재 카운트가 31이고 입력 이벤트 값이 2인 경우,\n실패 시 올바른 출력은 {31, 33} 중 하나만 가능하다.\n외부 조건에 따라 입력 이벤트가 버려진 경우 31, 그렇지 않은 경우 33입니다.")]),a._v(" "),t("h2",{attrs:{id:"정리"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#정리"}},[a._v("#")]),a._v(" 정리")]),a._v(" "),t("p",[a._v("결과적으로, 카프카의 강력한 기본 요소에 의존하는 단순하면서도 효과적인 디자인 되었다.")]),a._v(" "),t("p",[a._v("트랜잭션 로그는 카프카 토픽이므로 내구성이 보장된다.\n새로 도입된 트랜잭션 코디네이터는 브로커 내에서 실행되며, 장애 처리를 위해 Kafka의 리더 선출 알고리즘을 자연스럽게 활용한다.\nKafka의 Streams API로 구축된 스트림 처리 애플리케이션의 경우, 상태 저장소와 입력 오프셋의 소스가 Kafka 토픽이라는 사실을 활용하여 읽기-처리-쓰기 작업 전반에 걸쳐 정확히 한 번만 보장할 수 있다.")]),a._v(" "),t("h2",{attrs:{id:"참조"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#참조"}},[a._v("#")]),a._v(" 참조")]),a._v(" "),t("p",[t("a",{attrs:{href:"https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/",target:"_blank",rel:"noopener noreferrer"}},[a._v("https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/"),t("OutboundLink")],1)])])}),[],!1,null,null,null);e.default=_.exports}}]);