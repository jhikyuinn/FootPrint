# 실행과 테스트

Node.js 20.19.4 이상(또는 22.13 이상, 24.3 이상)이 필요합니다. React Native 0.86의 요구 사항입니다. Fabric 네트워크는 Linux 또는 WSL2 + Docker에서 실행합니다.

## 1. GUN Relay Server

    cd backend/gun-relay
    npm install
    npm start

포트 8765에서 실행됩니다. Docker를 사용하는 경우:

    docker build -t myrepo/gundb:v1 .
    docker run -p 8765:8765 myrepo/gundb:v1

## 2. Fabric 네트워크와 API 서버

fabric-samples 내려받기, 바이너리와 Docker 이미지 설치는 [backend/fabric/README.md](../backend/fabric/README.md)를 따릅니다. 준비가 끝난 뒤, Docker(Windows는 Docker Desktop)가 켜진 상태에서:

    cd backend/fabric
    bash startFabric.sh

    cd apiserver
    npm install
    node apiserver

Windows에서는 `startFabric.sh`를 WSL2 터미널에서 실행합니다. `fabric-samples/bin`의 Linux 실행 파일을 쓰기 때문에 Git Bash에서 실행하면 네트워크를 내린 뒤 다시 올리지 못하는데도 스크립트는 정상 종료합니다. 끝난 뒤 `docker ps`에 두 peer, orderer, 두 `dev-peer...P2Pmessage` 컨테이너가 있는지 확인합니다. API 서버는 Windows 터미널에서 실행해도 됩니다.

API 서버는 포트 1206에서 실행됩니다. 네트워크가 만든 User1 인증서를 시작할 때 읽으므로, 네트워크를 다시 만든 뒤에는 API 서버도 다시 시작합니다. API 서버를 실행하지 않으면 앱은 켜지지만 해시 기록, 해시 확인, 초대, 입장 기록 기능이 동작하지 않습니다.

## 3. 앱

    cd frontend
    npm install
    npx expo start --go

모바일 기기의 Expo Go 앱(Android) 또는 카메라 앱(iOS)으로 QR 코드를 읽습니다.

서버 주소는 `frontend/lib/config.js` 한 곳에서 읽으며, 기본값은 `localhost`입니다. 실제 기기에서 실행할 때는 `localhost`가 기기 자신을 가리키므로, `frontend/.env.local` 파일을 만들어 서버를 실행한 PC의 IP 주소를 적은 뒤 `npx expo start`를 다시 실행합니다. 기기와 PC는 같은 Wi-Fi에 있어야 합니다.

    EXPO_PUBLIC_API_URL=http://192.168.0.10:1206
    EXPO_PUBLIC_GUN_PEER=http://192.168.0.10:8765/gun

`.env.local`은 git에 올라가지 않습니다.

## 4. 테스트

    cd frontend
    npm test
    npm run e2e
    npm run e2e:profile
    npm run e2e:leave

- `npm test`: 메시지 정렬, 방 해시 계산, 안 읽은 개수 계산, 회의록, 다른 사람 프로필 검사(이미지 데이터만 사진으로 사용), 방을 나간 멤버 판단을 확인하는 단위 테스트입니다. 서버 없이 실행됩니다.
- `npm run e2e`: 브라우저 두 개로 앱을 열어, 한쪽의 relay 연결을 1초와 8초 동안 끊은 뒤 메시지가 양쪽으로 오가는지, 끊긴 동안 보낸 메시지가 도착하는지 확인합니다. 끊긴 동안 보내고 다시 연결되기 전에 새로고침한 메시지가 도착하는지, 방을 나가지 않고 앱을 다시 켰을 때 내 메시지가 안 읽은 개수에 잡히지 않는지도 확인합니다.
- `npm run e2e:profile`: 프로필 사진과 소개를 저장하고 새로고침 뒤에도 남는지, 다른 사용자가 채팅방에서 그 사진을 보고 눌러서 아이디와 소개를 확인하는지, 그 사용자가 방에 있는 동안 바꾼 소개가 바로 보이는지, 비밀번호 변경(틀린 현재 비밀번호 거부, 예전 비밀번호 거부, 새 비밀번호 로그인)을 확인합니다.
- `npm run e2e:leave`: 방을 나가면 내 방 목록에서 사라지는지, 원장에 leave가 기록되는지, 열려 있는 다른 멤버의 멤버 목록에서 바로 빠지고 예전 메시지는 남는지, 다시 들어오면 바로 멤버로 돌아오는지, 암호화 방은 나간 뒤 비밀번호를 다시 묻는지 확인합니다.
- 세 e2e 모두:
  - 1~2번(relay, Fabric과 API 서버)을 실행하고 앱을 웹으로 띄운 상태(`npx expo start --web`, 포트 8081)에서 실행합니다.
  - PC에 설치된 Chrome을 사용합니다. 다른 주소의 앱은 `E2E_APP_URL`로, `e2e:leave`가 원장을 확인할 API 서버는 `E2E_API_URL`(기본값 `http://localhost:1206`)로 지정합니다.
