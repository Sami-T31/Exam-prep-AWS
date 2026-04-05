# Question Format

Canonical sources:
- DTO: `backend/src/questions/dto/create-question.dto.ts`
- CSV import endpoint: `backend/src/questions/admin-questions.controller.ts`
- Shared validation: `packages/shared/src/validation/content.ts`

## Canonical JSON Schema (Admin Create Question)
Required fields:
- `questionText` (string, 10..2000)
- `difficulty` (`EASY` | `MEDIUM` | `HARD`)
- `topicId` (int > 0)
- `gradeId` (int > 0)
- `options` (array of exactly 4)

Optional fields:
- `explanation` (string, max 3000)
- `year` (int)
- `status` (`DRAFT` | `PUBLISHED` | `ARCHIVED`, default `DRAFT`)

Option object:
- `optionLabel` (`A` | `B` | `C` | `D`)
- `optionText` (string, max 500)
- `isCorrect` (boolean)

Rule: exactly one option must have `isCorrect = true`.

## JSON Example
```json
{
  "questionText": "What is the correct formula for force?",
  "explanation": "Newton's second law: force equals mass multiplied by acceleration.",
  "difficulty": "EASY",
  "topicId": 21,
  "gradeId": 4,
  "year": 2016,
  "status": "DRAFT",
  "options": [
    { "optionLabel": "A", "optionText": "F = m * a", "isCorrect": true },
    { "optionLabel": "B", "optionText": "F = m / a", "isCorrect": false },
    { "optionLabel": "C", "optionText": "F = a / m", "isCorrect": false },
    { "optionLabel": "D", "optionText": "F = m + a", "isCorrect": false }
  ]
}
```

## Canonical CSV Import Format
CSV required columns (header names are case-insensitive in parser):
- `questionText`
- `difficulty`
- `topicId`
- `gradeId`
- `optionA`
- `optionB`
- `optionC`
- `optionD`
- `correctOption`

Optional columns:
- `explanation`
- `year`

### CSV row example
```csv
questionText,difficulty,topicId,gradeId,optionA,optionB,optionC,optionD,correctOption,explanation,year
"What is the correct formula for force?",EASY,21,4,"F = m * a","F = m / a","F = a / m","F = m + a",A,"Newton's second law.",2016
```

Parser behavior notes:
- Quoted CSV fields are supported by a simple parser in controller
- File must be `.csv`, accepted MIME types are restricted, and file size capped at 2MB
- Rows are validated and imported via service; invalid structure fails with clear error messages

## Mock-Exam Question Authoring
Mock exam question editor uses a similar 4-option structure via:
- `backend/src/mock-exams/dto/create-mock-exam-question.dto.ts`

This is separate from practice-question CSV import flow.

## UNKNOWN / TODO
- Confirm if future multilingual question content requires per-language fields in schema
- Confirm whether image-based question fields will be included in CSV format (currently not in import header)

---

## Update Protocol
### When to update
- Any DTO change for question create/update/import or CSV parser change

### Scan these areas
- `backend/src/questions/dto/*.ts`
- `backend/src/questions/admin-questions.controller.ts`
- `packages/shared/src/validation/content.ts`

### Checklist
- Required/optional fields still match code
- Option constraints (count/correct answer) still accurate
- CSV header list and examples still valid
- JSON example updated to latest accepted contract
