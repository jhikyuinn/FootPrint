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

fabric-samples 내려받기, 바이너리와 Docker 이미지 설치는 [backend/fabric/README.md](../backend/fabric/README.md)를 따릅니다. 준비가 끝난 뒤:

    cd backend/fabric
    bash startFabric.sh

    cd apiserver
    npm install
    node apiserver

API 서버는 포트 1206에서 실행됩니다. API 서버를 실행하지 않으면 앱은 켜지지만 해시 기록, 해시 확인, 초대, 입장 기록 기능이 동작하지 않습니다.

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

- `npm test`: 메시지 정렬, 방 해시 계산, 안 읽은 개수 계산을 확인하는 단위 테스트입니다. 서버 없이 실행됩니다.
- `npm run e2e`: 브라우저 두 개로 앱을 열어, 한쪽의 relay 연결을 1초와 8초 동안 끊은 뒤 메시지가 양쪽으로 오가는지, 끊긴 동안 보낸 메시지가 도착하는지 확인합니다. 끊긴 동안 보내고 다시 연결되기 전에 새로고침한 메시지가 도착하는지, 방을 나가지 않고 앱을 다시 켰을 때 내 메시지가 안 읽은 개수에 잡히지 않는지도 확인합니다.
  - 1~2번(relay, Fabric과 API 서버)을 실행하고 앱을 웹으로 띄운 상태(`npx expo start --web`, 포트 8081)에서 실행합니다.
  - PC에 설치된 Chrome을 사용합니다. 다른 주소의 앱은 `E2E_APP_URL`로 지정합니다.
