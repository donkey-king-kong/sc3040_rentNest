# RentNest

RentNest helps property owners list rental homes and users search for available rentals.

## Setup Instructions

### Required Installs
- Java JDK 21
- Maven
- Node.js and npm
- Expo Go mobile app, if testing on a physical phone
- DBeaver is optional, but useful for viewing the shared PostgreSQL database

### Backend Environment
1. Copy the example backend config:
```bash
cp RentNest/src/main/resources/application.properties.example RentNest/src/main/resources/application.properties
```

2. Fill in `RentNest/src/main/resources/application.properties` with the shared database credentials.

3. Generate your own JWT secret:
```bash
openssl rand -base64 32
```

4. Paste it into:
```properties
security.jwt.secret-key=
```

5. Use dummy external API keys for now if real keys are unavailable:
```properties
LTADATAMALL_ACCOUNTKEY=dummy
URA_ACCESSKEY=dummy
```

### Frontend Setup
The merged frontend uses Expo SDK 57. Use a compatible Expo Go version or development build for mobile testing.

1. Go to the frontend directory:
```bash
cd frontend/RentNest
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Start the frontend:
```bash
npm run start
```

4. Choose a platform:
```text
w = web
i = iOS simulator
a = Android emulator
```

### Mobile Demo
1. Connect your phone and computer to the same Wi-Fi.
2. Start the backend and find your computer's Wi-Fi IPv4 address using `ipconfig`.
3. In the frontend PowerShell terminal, set the backend address before starting Expo:
```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://YOUR_COMPUTER_IP:8080"
npm.cmd run start
```
4. Open the project on your phone using the Expo QR code. Keep both servers running.
5. Check login, listings, admin moderation, analytics, and the rental flows used in your demo.

### Backend Setup
1. Go to the backend directory:
```bash
cd RentNest
```

2. Start the backend:
```bash
mvn spring-boot:run -DskipTests
```

Use `mvn` instead of `./mvnw` because the Maven wrapper files are not included in this repository.

3. Backend runs at:
```text
http://localhost:8080
```

4. Swagger API docs:
```text
http://localhost:8080/swagger-ui/index.html
```

### Database Configuration
The app uses a shared Supabase PostgreSQL database. The real connection details are not committed to Git. Get the database URL, username, and password from the team.

The backend runs with `spring.jpa.hibernate.ddl-auto=validate`, so it never changes the shared schema. Read [docs/db/README.md](docs/db/README.md) before changing any entity class.

## Pre-Configured Users (Non-Exhaustive)

These are the accounts documented on main. Confirm the current passwords with the team before the demo.
| Role | Name | Email | Password |
| --- | --- | --- | --- |
| Owner | Superman | superman@gmail.com | superman123 |
| User Viewer | Batman | batman@gmail.com | batman123 |
| Admin | Admin | admin@gmail.com | admin123 |

## Tech Stack
- Frontend: React Native, Expo, JavaScript
- Backend: Spring Boot, Java
- Database: PostgreSQL via Supabase

## External APIs
- [Schools API](https://data.gov.sg/api/action/datastore_search?resource_id=d_688b934f82c1059ed0a6993d2a829089)
- [Hawker Centre API](https://data.gov.sg/api/action/datastore_search?resource_id=d_68a42f09f350881996d83f9cd73ab02f)
- [Bus Stop API](https://datamall2.mytransport.sg/ltaodataservice/BusStops)
- [URA Rental Prices API](https://www.ura.gov.sg/uraDataService/invokeUraDS?service=PMI_Resi_Rental&refPeriod=14q1)

## Verification
Backend tests use an isolated H2 database:
```powershell
cd RentNest
mvn test
```
Use JDK 21. If your installed JDK is 26, the current Mockito/Byte Buddy dependency requires:
```powershell
mvn test "-DargLine=-Dnet.bytebuddy.experimental=true"
```
Frontend checks, from `frontend/RentNest`:
```powershell
npx.cmd expo install --check
npm.cmd test -- --watchAll=false --runInBand
```

## Developer Notes
- [Listing Image Rendering Troubleshoot](Documentation/Troubleshooting/listing-images.md)
- [Profile Image Handling Troubleshoot](Documentation/Troubleshooting/profile-images.md)
