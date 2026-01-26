# P2P-messenger


l 사용자 간 동기화 (메시지 오더링) 지연 시간
l 로컬 스토리지 공간 낭비
l 비교적 다양한 기능 부재 (회의록/대화 내용 보관)

<img width="512" height="451" alt="image" src="https://github.com/user-attachments/assets/2ebefefd-42e9-4fce-97f7-04b6175c9eaa" />


1. git clone https://github.com/amark/gun.git 명령을 실행하여 소스 파일 설치

1-1. cd gun

1-2. docker build -t myrepo/gundb:v1 .

1-3. docker run -p 8765:8765 myrepo/gundb:v1 명령을 실행하여 Relay Server 배포

2. 프로그램을 실행하려는 모바일 기기에 Expo Go 애플리케이션 다운로드

3. 첨부된 파일을 압축 해제

4. cd P2PMesseage

5. npm install 명령을 실행하여 필요한 모듈 설치

6. expo start 명령을 사용하여 프로그램 실행할 수 있는 QR코드 생성

6-1. Ios 기반의 모바일 기기의 경우 카메라 앱에서 QR코드 찍기

6-2. android 기반의 모바일 기기의 경우 Expo Go 앱에서 QR코드 찍기

7. 메인 화면에서 로그인 진행

7-1. 로그인 정보가 없다면 회원가입 우선 진행 

8. 방 참가화면에서 참여하려는 방 이름 입력

9. 방 입장 시 해당 방의 채팅 내용 자동으로 기록

10. 오른쪽 상단의 디스크 아이콘 클릭 시 해당 시점의 채팅 내용을 해시값으로 기록

11. 오른쪽 상단의 체크 아이콘 클릭 시 저장되어있는 채팅방 해시값과 해당 시점의 채팅 내용의 해시값을 비교

<img width="866" height="474" alt="image" src="https://github.com/user-attachments/assets/c98b061e-463b-4ce6-a763-ecd865a3b20d" />


Demo: https://www.youtube.com/watch?v=gxX6pE9dn04
