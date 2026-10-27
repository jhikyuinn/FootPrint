# FootPrint

대화 내용은 P2P 데이터베이스(GunDB)에 저장하고, 그 내용의 해시값을 블록체인(Hyperledger Fabric)에 기록해 대화 기록이 바뀌지 않았는지 확인할 수 있는 모바일 메신저입니다.

Demo: https://www.youtube.com/watch?v=gxX6pE9dn04

## 동기

중앙집중형 메신저는 모든 대화가 운영자의 서버에 저장됩니다. 서버를 가진 쪽이 대화 내용을 바꾸거나 지울 수 있고, 서버에 문제가 생기면 대화 내용이 사라질 수 있습니다.

FootPrint는 이 문제를 해결하기 위해 메신저를 분산화하는 데서 출발했습니다. 대화 내용을 한 곳이 아니라 참여자들이 나누어 보관하면, 누구도 혼자서 내용을 바꿀 수 없고 내용이 사라지지도 않습니다.

하지만 분산화만으로는 부족합니다. 누군가 자신이 가진 내용을 바꾼 뒤 "원래 이 내용이었다"고 우길 수 있기 때문입니다. 그래서 대화 내용의 해시값과 방 활동 기록을 블록체인에 남겨, "이 시점의 대화가 이 내용이었다"는 흔적(footprint)을 누구나 확인할 수 있게 했습니다.

<img width="512" height="451" alt="image" src="https://github.com/user-attachments/assets/2ebefefd-42e9-4fce-97f7-04b6175c9eaa" />

## 사용 기술

| 구분 | 기술 | 역할 |
| --- | --- | --- |
| 앱 | React Native 0.86, Expo SDK 57 | iOS / Android 화면 |
| 메시지 저장 | GunDB | 채팅방과 메시지를 기기 간에 동기화 |
| 계정 / 암호 | GunDB SEA | 회원가입, 로그인, 메시지 서명과 암호화 |
| Relay | Node.js + GunDB (`backend/gun-relay`) | 기기들이 서로 데이터를 주고받는 중계 서버 |
| 블록체인 | Hyperledger Fabric 2.5, JavaScript 체인코드 `P2Pmessage` | 해시값과 방 활동 기록 저장 |
| API 서버 | Express + `fabric-network` SDK (`backend/fabric/apiserver`) | 앱의 요청을 Fabric 트랜잭션으로 전달 |

## 폴더 구조

- `frontend` : React Native(Expo) 앱
- `backend/gun-relay` : GUN Relay Server
- `backend/fabric` : 체인코드, API 서버, 네트워크 실행 스크립트 ([상세 설명](backend/fabric/README.md))

## 고려한 점

- **대화 내용과 증명의 분리** : 메시지 전체를 블록체인에 올리면 용량과 속도, 공개 범위가 문제가 되므로 메시지는 GunDB에 두고 SHA-256 해시값만 원장에 기록합니다.
- **서버에 비밀번호를 두지 않는 계정** : SEA는 비밀번호로 개인키를 암호화해 보관하므로, 비밀번호를 검사하는 중앙 서버가 없습니다.
- **메시지 서명** : 메시지는 보낸 사람의 키로 서명해 저장하고, 읽을 때 서명을 확인합니다.
- **방 활동 기록** : 방 개설(`create`), 입장(`enter`), 해시 기록(`record`)을 원장에 남깁니다. 방마다 최신 기록 하나를 유지하고, 이전 기록은 Fabric의 키 이력(history)으로 조회합니다.
- **초대** : 초대는 방 기록과 다른 키(`invite~받는사람~방`)에 저장해 방의 최신 해시를 덮어쓰지 않고, 받은 사람이 수락하거나 거절할 때까지 남습니다.
- **암호화 방** : 방을 만들 때 자유 방과 암호화 방 중에 고릅니다. 암호화 방의 메시지는 방 비밀번호로 만든 방 키로 암호화합니다. 초대에는 방 키를 받는 사람만 열 수 있게 암호화해 담으므로, 초대를 수락하면 비밀번호 없이 들어갑니다. 한 번 들어간 방의 키는 각자의 사용자 공간에 암호화해 보관합니다.
- **React Native에서의 암호 연산** : React Native에는 SEA가 필요로 하는 WebCrypto가 없어서, 보이지 않는 WebView 안에서 암호 연산을 수행하도록 연결했습니다(`frontend/lib/cryptoBridge.js`).
- **P2P 방식의 문제** : 사용자 간 동기화(메시지 순서 정렬) 지연, 각 기기의 로컬 저장 공간 낭비, 회의록·대화 내용 보관 같은 부가 기능의 부재를 함께 고려했습니다.

## 실행 방법

Node.js 20.19.4 이상(또는 22.13 이상, 24.3 이상)이 필요합니다. React Native 0.86의 요구 사항입니다. Fabric 네트워크는 Linux 또는 WSL2 + Docker에서 실행합니다.

### 1. GUN Relay Server

    cd backend/gun-relay
    npm install
    npm start

포트 8765에서 실행됩니다. Docker를 사용하는 경우:

    docker build -t myrepo/gundb:v1 .
    docker run -p 8765:8765 myrepo/gundb:v1

### 2. Fabric 네트워크와 API 서버

fabric-samples 내려받기, 바이너리와 Docker 이미지 설치는 [backend/fabric/README.md](backend/fabric/README.md)를 따릅니다. 준비가 끝난 뒤:

    cd backend/fabric
    bash startFabric.sh

    cd apiserver
    npm install
    node enrollAdmin
    node registerUser
    node apiserver

API 서버는 포트 1206에서 실행됩니다. API 서버를 실행하지 않으면 앱은 켜지지만 해시 기록, 해시 확인, 초대, 입장 기록 기능이 동작하지 않습니다.

### 3. 앱

    cd frontend
    npm install
    npx expo start --go

모바일 기기의 Expo Go 앱(Android) 또는 카메라 앱(iOS)으로 QR 코드를 읽습니다.

서버 주소는 `frontend/lib/config.js` 한 곳에서 읽으며, 기본값은 `localhost`입니다. 실제 기기에서 실행할 때는 `localhost`가 기기 자신을 가리키므로, `frontend/.env.local` 파일을 만들어 서버를 실행한 PC의 IP 주소를 적은 뒤 `npx expo start`를 다시 실행합니다. 기기와 PC는 같은 Wi-Fi에 있어야 합니다.

    EXPO_PUBLIC_API_URL=http://192.168.0.10:1206
    EXPO_PUBLIC_GUN_PEER=http://192.168.0.10:8765/gun

`.env.local`은 git에 올라가지 않습니다.

### 4. 테스트

    cd frontend
    npm test
    npm run e2e

- `npm test`: 메시지 정렬, 방 해시 계산, 안 읽은 개수 계산을 확인하는 단위 테스트입니다. 서버 없이 실행됩니다.
- `npm run e2e`: 브라우저 두 개로 앱을 열어, 한쪽의 relay 연결을 1초와 8초 동안 끊은 뒤 메시지가 양쪽으로 오가는지, 끊긴 동안 보낸 메시지가 도착하는지 확인합니다.
  - 1~2번(relay, Fabric과 API 서버)을 실행하고 앱을 웹으로 띄운 상태(`npx expo start --web`, 포트 8081)에서 실행합니다.
  - PC에 설치된 Chrome을 사용합니다. 다른 주소의 앱은 `E2E_APP_URL`로 지정합니다.

## 사용 방법

1. 메인 화면에서 ID와 비밀번호(8자 이상)로 회원가입한 뒤 로그인합니다.
2. 방 참가 화면에서 참여할 방 이름을 입력합니다. 없는 방이면 자유 방 / 암호화 방을 골라 새로 개설하고, 암호화 방은 비밀번호를 정합니다. 암호화 방에 검색으로 들어가면 비밀번호를 묻습니다.
3. 방에 처음 입장하면 입장 기록(`enter`)이 원장에 남습니다. 입장 직후에는 메시지가 아직 동기화 중이라, 해시값은 대화가 다 불러와진 뒤 Record Hash로 기록합니다.
4. 오른쪽 위 목록 아이콘을 누르면 메뉴가 열립니다.
   - **Record Hash** : 현재 대화 내용의 해시값을 블록체인에 기록합니다.
   - **Check Hash** : 블록체인에 기록된 해시값과 현재 대화 내용의 해시값을 비교합니다.
   - **Invitation** : 다른 사용자를 초대합니다. 초대받은 사람은 알림 화면에서 수락하거나 거절합니다.

<img width="866" height="474" alt="image" src="https://github.com/user-attachments/assets/c98b061e-463b-4ce6-a763-ecd865a3b20d" />

## 한계와 개선 방향

- 자유 방의 메시지 암호화에 쓰는 키는 방 안에 공개되어 있어, 방 이름을 아는 사람은 내용을 읽을 수 있습니다. 비밀 대화는 암호화 방을 사용합니다.
- 암호화 방의 비밀번호 확인값은 공개되어 있어, 짧은 비밀번호는 오프라인 대입 공격에 약합니다.
- 해시값은 방 전체에 대해 하나만 유지되므로, 새 메시지가 추가된 것과 기존 메시지가 변조된 것을 구분하지 못합니다. 이전 해시를 포함하는 연결 구조가 필요합니다.
- API 서버에 인증이 없고 모든 트랜잭션이 하나의 Fabric 계정으로 기록되어, 누가 기록했는지는 앱이 보낸 이름에만 의존합니다.
- Relay와 API 서버가 각각 한 대이며, Fabric은 테스트 네트워크에서만 확인했습니다.
