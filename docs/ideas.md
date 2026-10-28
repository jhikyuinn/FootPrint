# 아이디어

완료 기준(`DONE.md`) 밖의 개선 제안. 바로 진행하지 않고, 나중에 할지 판단한다.

## 저장소 관리
- **CI 추가**: GitHub Actions로 `frontend`의 `npm test`와 체인코드의 `npm test`를 PR마다 실행한다.
  지금은 테스트가 통과하는지 로컬에서만 확인할 수 있다.
- **체인코드 lockfile 커밋**: `backend/fabric/chaincode/P2Pmessage/javascript`에 `package-lock.json`이 없어서
  설치할 때마다 의존성 버전이 달라질 수 있다.

## 열린 이슈 진행 순서 (제안)
1. 보안, 작은 것부터: #33 방 비밀번호 길이 → #31 방 노드 접두사 → #30 초대 방 키 검증
2. 보안, API 인증: #20 서명 검증 → #35 초대 API 본인 확인 (#20 방식 재사용)
3. 기능: #11 로그인 유지, #12 프로필 수정, #41 방 나가기, #45 최근 메시지만 불러오기
4. 의존성·인프라: #43 react-native-elements 교체, #42 fabric-gateway 이전, #65 GUN 재연결 정리
5. README의 "향후 계획"으로만 남길 것: #24 파일 전송, #23 푸시 알림, #25 HTTPS와 relay 여러 대
