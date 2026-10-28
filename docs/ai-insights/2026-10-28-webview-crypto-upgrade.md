# lodash 취약점: overrides 대신 webview-crypto 업그레이드 (#43 후속)

- 지적/발견: `react-native-elements`를 지워도 critical lodash가 남았다. `webview-crypto` 0.1.13이 `lodash@4.17.3`을 쓰고 있었고, 0.1.14는 lodash에 의존하지 않았다.
- 판단: 반영함. overrides로 버전을 강제하지 않고 0.1.14로 올림. 올리기 전에 배포 출처(GitHub Actions, provenance)와 소스 차이(외부 통신·eval 추가 없음)를 확인했다.
- 이유: 쓰던 곳이 `find` 두 군데뿐이라 의존성 자체를 없애는 쪽이 확실했다. 3년 반 만의 새 버전이라 공급망 위험을 먼저 확인했고, node에서 브리지 양쪽을 연결해 SEA가 쓰는 암호화 호출을 시험한 뒤, iPhone에서도 동작을 확인했다.
