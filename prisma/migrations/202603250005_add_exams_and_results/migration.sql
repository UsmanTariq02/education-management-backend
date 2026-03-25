CREATE TYPE "StudentExamResultStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "Exam" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "academicSessionId" UUID,
  "batchId" UUID NOT NULL,
  "teacherId" UUID,
  "name" VARCHAR(150) NOT NULL,
  "code" VARCHAR(60) NOT NULL,
  "description" TEXT,
  "examDate" TIMESTAMP(3) NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExamSubject" (
  "id" UUID NOT NULL,
  "examId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "totalMarks" DECIMAL(8,2) NOT NULL,
  "passMarks" DECIMAL(8,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamSubject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentExamResult" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "academicSessionId" UUID,
  "examId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "batchId" UUID NOT NULL,
  "totalObtained" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "grade" VARCHAR(20),
  "remarks" TEXT,
  "status" "StudentExamResultStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentExamResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentExamResultItem" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "resultId" UUID NOT NULL,
  "examSubjectId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "obtainedMarks" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "grade" VARCHAR(20),
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentExamResultItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Exam_organizationId_code_key" ON "Exam"("organizationId", "code");
CREATE INDEX "Exam_organizationId_examDate_idx" ON "Exam"("organizationId", "examDate");
CREATE INDEX "Exam_batchId_examDate_idx" ON "Exam"("batchId", "examDate");

CREATE UNIQUE INDEX "ExamSubject_examId_subjectId_key" ON "ExamSubject"("examId", "subjectId");
CREATE INDEX "ExamSubject_subjectId_idx" ON "ExamSubject"("subjectId");

CREATE UNIQUE INDEX "StudentExamResult_examId_studentId_key" ON "StudentExamResult"("examId", "studentId");
CREATE INDEX "StudentExamResult_organizationId_status_idx" ON "StudentExamResult"("organizationId", "status");
CREATE INDEX "StudentExamResult_batchId_status_idx" ON "StudentExamResult"("batchId", "status");

CREATE UNIQUE INDEX "StudentExamResultItem_resultId_examSubjectId_key" ON "StudentExamResultItem"("resultId", "examSubjectId");
CREATE INDEX "StudentExamResultItem_organizationId_subjectId_idx" ON "StudentExamResultItem"("organizationId", "subjectId");

ALTER TABLE "Exam"
ADD CONSTRAINT "Exam_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Exam"
ADD CONSTRAINT "Exam_academicSessionId_fkey"
FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Exam"
ADD CONSTRAINT "Exam_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Exam"
ADD CONSTRAINT "Exam_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExamSubject"
ADD CONSTRAINT "ExamSubject_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExamSubject"
ADD CONSTRAINT "ExamSubject_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentExamResult"
ADD CONSTRAINT "StudentExamResult_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentExamResult"
ADD CONSTRAINT "StudentExamResult_academicSessionId_fkey"
FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentExamResult"
ADD CONSTRAINT "StudentExamResult_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentExamResult"
ADD CONSTRAINT "StudentExamResult_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentExamResult"
ADD CONSTRAINT "StudentExamResult_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentExamResultItem"
ADD CONSTRAINT "StudentExamResultItem_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentExamResultItem"
ADD CONSTRAINT "StudentExamResultItem_resultId_fkey"
FOREIGN KEY ("resultId") REFERENCES "StudentExamResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentExamResultItem"
ADD CONSTRAINT "StudentExamResultItem_examSubjectId_fkey"
FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentExamResultItem"
ADD CONSTRAINT "StudentExamResultItem_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
