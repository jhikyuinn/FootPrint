# FootPrint

대화 내용은 P2P 데이터베이스(GunDB)에 저장하고, 그 내용의 해시값을 블록체인(Hyperledger Fabric)에 기록해 대화 기록이 바뀌지 않았는지 확인할 수 있는 모바일 메신저입니다.

Demo: https://www.youtube.com/watch?v=gxX6pE9dn04

<img width="512" height="451" alt="image" src="https://github.com/user-attachments/assets/2ebefefd-42e9-4fce-97f7-04b6175c9eaa" />

## 구조

```
 앱 (React Native / Expo)
   │  메시지, 방, 계정 ─────────▶ GUN Relay (:8765) ◀──── 다른 사용자의 앱
   │
   └─ 해시 기록 / 확인, 초대 ──▶ API 서버 (:1206) ──▶ Fabric 체인코드 P2Pmessage
```

- 메시지는 GunDB로 기기 간에 동기화되고, 보낸 사람의 키로 서명됩니다.
- **Record Hash**는 대화 내용의 SHA-256 해시를 원장에 기록하고(새 메시지 10개마다, 방을 나갈 때는 자동), **Check Hash**는 원장의 기록마다 지금 대화와 일치하는지 확인합니다. 메시지가 추가된 것과 예전 메시지가 바뀐 것을 구분합니다.
- **Export Minutes**는 대화를 회의록 파일로 내보냅니다. 파일을 받은 사람은 앱, 방 비밀번호, 방 키 없이 `npm run verify-minutes`로 확인할 수 있습니다. 확인하는 것은 세 가지입니다. 메시지마다 보낸 계정의 서명이 맞는지, 평문이 암호문과 같은지, 대화가 원장의 해시와 일치하는지입니다.

설계 이유와 한계는 [docs/architecture.md](docs/architecture.md)에 있습니다.

## 사용 기술

| 구분 | 기술 |
| --- | --- |
| 앱 | React Native 0.86, Expo SDK 57 |
| 메시지 저장 / 계정 | GunDB, GunDB SEA (회원가입, 서명, 암호화) |
| Relay | Node.js + GunDB (`backend/gun-relay`) |
| 블록체인 | Hyperledger Fabric 2.5, JavaScript 체인코드 `P2Pmessage` |
| API 서버 | Express + `fabric-network` SDK (`backend/fabric/apiserver`) |

## 폴더 구조

- `frontend` : React Native(Expo) 앱
- `backend/gun-relay` : GUN Relay Server
- `backend/fabric` : 체인코드, API 서버, 네트워크 실행 스크립트 ([상세 설명](backend/fabric/README.md))

## 실행

Relay, Fabric과 API 서버, 앱 순서로 실행합니다. 설치, 실제 기기 연결, 테스트는 [docs/setup.md](docs/setup.md)를 봅니다.

    cd backend/gun-relay && npm install && npm start        # :8765
    cd backend/fabric && bash startFabric.sh                 # Linux / WSL2
    cd backend/fabric/apiserver && npm install && node enrollAdmin && node registerUser && node apiserver   # :1206
    cd frontend && npm install && npx expo start --go

## 사용 방법

1. ID와 비밀번호(8자 이상)로 회원가입한 뒤 로그인합니다.
2. 방 이름을 검색해 들어갑니다. 없는 방이면 자유 방 / 암호화 방을 골라 새로 만듭니다.
3. 오른쪽 위 메뉴에서 **Record Hash**, **Check Hash**, **Export Minutes**(회의록 내보내기), **Invitation**(다른 사용자 초대)을 사용합니다.
4. 내보낸 회의록은 `cd frontend && npm run verify-minutes -- <파일> [API 주소]`로 확인합니다. 원장 기록은 파일에 적힌 값이 아니라 API 서버에서 다시 받아 비교합니다.

<img width="866" height="474" alt="image" src="https://github.com/user-attachments/assets/c98b061e-463b-4ce6-a763-ecd865a3b20d" />
