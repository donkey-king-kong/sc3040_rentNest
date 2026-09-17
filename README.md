# RentNest

RentNest helps property owners list rental homes and users search for available rentals.

## Setup Instructions

### Required Installs
- Java JDK
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

## Pre-Configured Users
| Role | Name | Email | Password |
| --- | --- | --- | --- |
| Owner | Superman | superman@gmail.com | 12345678 |
| User Viewer | Batman | batman@gmail.com | 12345678 |
| Admin | Admin | admin@gmail.com | 12345678 |

## Tech Stack
- Frontend: React Native, Expo, JavaScript
- Backend: Spring Boot, Java
- Database: PostgreSQL via Supabase

## External APIs
- [Schools API](https://data.gov.sg/api/action/datastore_search?resource_id=d_688b934f82c1059ed0a6993d2a829089)
- [Hawker Centre API](https://data.gov.sg/api/action/datastore_search?resource_id=d_68a42f09f350881996d83f9cd73ab02f)
- [Bus Stop API](https://datamall2.mytransport.sg/ltaodataservice/BusStops)
- [URA Rental Prices API](https://www.ura.gov.sg/uraDataService/invokeUraDS?service=PMI_Resi_Rental&refPeriod=14q1)
