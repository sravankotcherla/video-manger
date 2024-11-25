# Video Processing Server

A RESTful Node.js server for handling video upload, processing (trimming, merging), and generating secure video links.

---

## Features

- **Video Upload** (`POST /videos/upload`): Store video files securely on the server.
- **Video Trimming** (`POST /videos/:id/trim`): Extract segments of videos with defined start time and duration.
- **Video Merging** (`POST /videos/merge`): Combine multiple videos into a single output.
- **Video Link Generation** (`GET /videos/:id/link`): Generate secure, time-limited download links for videos.

---

## Setup and Installation

### Prerequisites

- **Node.js** = 22
- **npm**
- **FFmpeg**: Ensure FFmpeg is installed and accessible in your PATH.

### Steps

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd <repo-name>
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up the environment**:
   Create an `.env` file using the provided `.env.example` file:
   ```bash
   cp .env.example .env
   ```
4. **Run server**:
   ```bash
   npm start
   ```
5. **Run Tests**
   ```bash
   npm run test:coverage // For test coverage
   npm run test // run all tests
   npm run test:coverage // run unit tests
   npm run test:coverage // run e2e tests
   ```

## Notes

- **FFmpeg**: This server relies on [FFmpeg](https://ffmpeg.org/) for handling video processing tasks such as trimming and merging. Make sure FFmpeg is installed and accessible in the system's PATH. You can install FFmpeg on your system by following the instructions on the FFmpeg website.

- **JWT Expiry**: The download links for the videos generated by the server are secured using JWT (JSON Web Tokens). These links are time-limited and will expire based on the `VIDEO_LINK_EXPIRY` environment variable, which is configured in seconds. After the token expires, the link will no longer be valid, ensuring secure and temporary access to video downloads.

## Limitations and Improvements

- **Hosting Vidoes**: Currently writing the uploaded files to a folder in project root directory for easy access. Better to upload videos to cloud services like S3.
- **Merging**: Can merge only videos of same type and resolution

## References

- [Node.js Documentation](https://nodejs.org/en/docs/): The official documentation for Node.js, which is the runtime environment used for building this server.

- [npm Documentation](https://docs.npmjs.com/): The official npm documentation, which provides detailed information about package management and scripts used in this project.

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html): Official documentation for FFmpeg, which is used for video processing tasks like trimming and merging in this server.

- [JWT.io Documentation](https://jwt.io/introduction/): A comprehensive guide to understanding and working with JSON Web Tokens (JWT), used for securing video download links in this server.

- [Supertest Documentation](https://github.com/visionmedia/supertest): Documentation for Supertest, a popular testing library used in this project to write and execute end-to-end API tests.

- [Jest Documentation](https://jestjs.io/docs/en/getting-started): Jest documentation, which explains how to write tests for JavaScript applications, including unit tests and end-to-end tests like those in this project.

- [SQLite3 GitHub Repository](https://github.com/mapbox/node-sqlite3): GitHub page for the `sqlite3` package used for database interactions in this project. It provides the interface to interact with SQLite databases in Node.js.
