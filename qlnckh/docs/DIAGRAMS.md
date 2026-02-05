# BIỂU ĐỒ MERMAID CHO BÁO CÁO ĐỒ ÁN

> Mỗi biểu đồ vừa 1 trang A4. Render tại https://mermaid.live → Export PNG → Chèn Word.

---

## Hình 1.1 – Mô hình State Machine tổng quát (Mục 1.2.3)

```mermaid
stateDiagram-v2
    direction LR
    [*] --> S1: Event A
    S1 --> S2: Event B\n[Guard: điều kiện]
    S2 --> S3: Event C
    S2 --> S1: Event D\n/ Action: ghi log
    S3 --> [*]

    note right of S1: State\n(Trạng thái)
    note right of S2: Transition = Event + Guard + Action
```

---

## Hình 2.1 – Biểu đồ Use Case (Mục 2.3.1)

```mermaid
graph TB
    GV(("Giảng viên\nGIANG_VIEN"))
    QLK(("Quản lý khoa\nQUAN_LY_KHOA"))
    PKH(("Phòng KHCN\nPHONG_KHCN"))
    BGH(("Ban Giám học\nBAN_GIAM_HOC"))
    ADM(("Admin\nADMIN"))

    subgraph "HỆ THỐNG QUẢN LÝ NCKH"
        UC1[Tạo đề tài]
        UC2[Nộp đề tài – SUBMIT]
        UC3[Rút đề tài – WITHDRAW]
        UC4[Gán HĐ khoa]
        UC5[Gán HĐ trường]
        UC6[Đánh giá đề tài]
        UC7[Tổng hợp – FINALIZE]
        UC8[Phê duyệt – APPROVE]
        UC9[Trả về – RETURN]
        UC10[Từ chối – REJECT]
        UC11[Dashboard thống kê]
        UC12[Quản lý người dùng]
        UC13[Quản lý biểu mẫu]
    end

    GV --- UC1
    GV --- UC2
    GV --- UC3
    QLK --- UC4
    QLK --- UC6
    QLK --- UC7
    QLK --- UC8
    QLK --- UC9
    PKH --- UC5
    PKH --- UC11
    PKH --- UC13
    BGH --- UC8
    BGH --- UC10
    BGH --- UC11
    ADM --- UC12
    ADM --- UC13
```

---

## Hình 2.2 – Biểu đồ trạng thái: Luồng chính (Mục 2.3.2)

```mermaid
stateDiagram-v2
    direction TB
    [*] --> DRAFT
    DRAFT --> FC_OUTLINE: SUBMIT\n[GIANG_VIEN]
    FC_OUTLINE --> SC_OUTLINE: APPROVE\n[QUAN_LY_KHOA]
    SC_OUTLINE --> APPROVED: APPROVE\n[BAN_GIAM_HOC]
    APPROVED --> IN_PROGRESS: START_PROJECT
    IN_PROGRESS --> FC_ACCEPT: SUBMIT_ACCEPTANCE
    FC_ACCEPT --> SC_ACCEPT: FACULTY_ACCEPT
    SC_ACCEPT --> HANDOVER: ACCEPT\n[BAN_GIAM_HOC]
    HANDOVER --> COMPLETED: HANDOVER_COMPLETE
    COMPLETED --> [*]

    state "FACULTY_COUNCIL\nOUTLINE_REVIEW" as FC_OUTLINE
    state "SCHOOL_COUNCIL\nOUTLINE_REVIEW" as SC_OUTLINE
    state "FACULTY_COUNCIL\nACCEPTANCE_REVIEW" as FC_ACCEPT
    state "SCHOOL_COUNCIL\nACCEPTANCE_REVIEW" as SC_ACCEPT
```

---

## Hình 2.3 – Biểu đồ trạng thái: Luồng phụ và ngoại lệ (Mục 2.3.2)

```mermaid
stateDiagram-v2
    direction TB

    state "FACULTY_COUNCIL\nOUTLINE_REVIEW" as FC
    state "SCHOOL_COUNCIL\nOUTLINE_REVIEW" as SC
    state "CHANGES\nREQUESTED" as CR

    FC --> CR: RETURN
    SC --> CR: RETURN
    CR --> FC: RESUBMIT\n(nếu trước đó ở FC)
    CR --> SC: RESUBMIT\n(nếu trước đó ở SC)

    FC --> REJECTED: REJECT
    SC --> REJECTED: REJECT
    CR --> REJECTED: REJECT

    FC --> WITHDRAWN: WITHDRAW\n[GIANG_VIEN]
    SC --> WITHDRAWN: WITHDRAW\n[GIANG_VIEN]
    CR --> WITHDRAWN: WITHDRAW\n[GIANG_VIEN]

    DRAFT --> CANCELLED: CANCEL\n[GIANG_VIEN]

    state "Bất kỳ trạng thái\nhoạt động" as ANY
    ANY --> PAUSED: PAUSE\n[PHONG_KHCN]
    PAUSED --> ANY: RESUME\n[PHONG_KHCN]\n(về trạng thái trước)
    PAUSED --> CANCELLED: CANCEL
```

---

## Hình 2.4 – Biểu đồ ERD các bảng chính (Mục 2.3.3)

```mermaid
erDiagram
    users ||--o{ proposals : "owns"
    users ||--o{ council_members : "joins"
    users ||--o{ evaluations : "evaluates"
    faculties ||--o{ users : "has"
    faculties ||--o{ proposals : "contains"
    proposals ||--o{ evaluations : "has"
    proposals ||--o{ workflow_logs : "logs"
    proposals ||--o{ attachments : "attaches"
    proposals }o--o| councils : "assigned"
    proposals }o--o| form_templates : "uses"
    councils ||--o{ council_members : "has"
    form_templates ||--o{ form_sections : "defines"

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar display_name
        enum role "UserRole"
        uuid faculty_id FK
    }
    proposals {
        uuid id PK
        varchar code UK "DT-XXX"
        varchar title
        enum state "ProjectState"
        uuid owner_id FK
        uuid faculty_id FK
        uuid council_id FK
        json form_data
    }
    councils {
        uuid id PK
        varchar name
        enum type "CouncilType"
        enum scope "FACULTY|SCHOOL"
    }
    council_members {
        uuid id PK
        uuid council_id FK
        uuid user_id FK
        enum role "CHAIR|SECRETARY|MEMBER"
    }
    evaluations {
        uuid id PK
        uuid proposal_id FK
        uuid evaluator_id FK
        enum state "DRAFT|SUBMITTED|FINALIZED"
        json form_data
    }
    workflow_logs {
        uuid id PK
        uuid proposal_id FK
        enum action "WorkflowAction"
        enum from_state "ProjectState"
        enum to_state "ProjectState"
        uuid actor_id
    }
```

---

## Hình 2.5 – Kiến trúc hệ thống 3 tầng (Mục 2.3.4)

```mermaid
graph TB
    subgraph P["Tầng trình bày – Presentation"]
        FE["React 19 + Vite\n(SPA, 97 components)"]
    end
    subgraph B["Tầng nghiệp vụ – Business Logic"]
        BE["NestJS Backend\n(27 modules)"]
        G["Guards\nJWT · RBAC"]
        S["Services\nProposals · Workflow\nCouncils · Evaluations"]
    end
    subgraph D["Tầng dữ liệu – Data"]
        ORM["Prisma ORM"]
        DB[("PostgreSQL 15\n18 bảng · 16 enums")]
    end

    FE -->|"REST API\nJWT Bearer"| G
    G --> BE
    BE --> S
    S --> ORM
    ORM --> DB

    style P fill:#e3f2fd,stroke:#1565c0
    style B fill:#f3e5f5,stroke:#7b1fa2
    style D fill:#e8f5e9,stroke:#388e3c
```

---

## Hình 2.6 – Biểu đồ hoạt động: Quy trình xét duyệt đề cương (Mục 2.3.2)

```mermaid
flowchart TD
    A([Bắt đầu]) --> B[GV tạo đề tài\nstate = DRAFT]
    B --> C[GV nộp đề tài\naction: SUBMIT]
    C --> D["state = FC_OUTLINE_REVIEW"]
    D --> E[QLK gán HĐ khoa]
    E --> F[Thành viên HĐ\nđánh giá độc lập]
    F --> G{Tất cả đã\nnộp đánh giá?}
    G -->|Chưa| F
    G -->|Rồi| H[Thư ký tổng hợp\naction: FINALIZE]
    H --> I{Kết quả?}
    I -->|APPROVE| J["state = SC_OUTLINE_REVIEW"]
    I -->|RETURN| K["state = CHANGES_REQUESTED"]
    I -->|REJECT| L(["REJECTED ✗"])
    K --> M[GV chỉnh sửa\nvà nộp lại]
    M --> D
    J --> N[PHONG_KHCN gán\nHĐ trường]
    N --> O[Thành viên HĐ\nđánh giá độc lập]
    O --> P{Tất cả đã\nnộp đánh giá?}
    P -->|Chưa| O
    P -->|Rồi| Q[Thư ký tổng hợp\naction: FINALIZE]
    Q --> R{Kết quả?}
    R -->|APPROVE| S(["APPROVED ✓"])
    R -->|RETURN| K
    R -->|REJECT| L

    style A fill:#4caf50,color:#fff
    style S fill:#2196f3,color:#fff
    style L fill:#f44336,color:#fff
```

---

## Hình 3.1 – Cấu trúc module Backend (Mục 3.1.2)

```mermaid
graph LR
    subgraph Core["Core Modules"]
        auth["auth\nJWT + bcrypt"]
        rbac["rbac\nRoles · Permissions"]
        users["users\nCRUD người dùng"]
    end
    subgraph Business["Business Modules"]
        proposals["proposals\nQuản lý đề tài"]
        workflow["workflow\nState Machine"]
        council["council\nHội đồng"]
        evaluations["evaluations\nĐánh giá"]
        form["form-templates\nBiểu mẫu động"]
    end
    subgraph Support["Support Modules"]
        attachments["attachments"]
        documents["documents"]
        exports["exports"]
        dashboard["dashboard"]
        audit["audit"]
        notif["notifications"]
    end

    auth --> rbac
    proposals --> workflow
    proposals --> council
    council --> evaluations
    proposals --> form
    proposals --> attachments
    proposals --> documents

    style Core fill:#e8eaf6,stroke:#3f51b5
    style Business fill:#fce4ec,stroke:#c62828
    style Support fill:#e0f2f1,stroke:#00695c
```

---

## Hình 3.2 – Biểu đồ trình tự: Xét duyệt hội đồng (Mục 3.2.3)

```mermaid
sequenceDiagram
    actor GV as Giảng viên
    participant API as Backend API
    participant WF as WorkflowService
    participant DB as PostgreSQL

    GV->>API: POST /proposals {formData}
    API->>DB: INSERT proposal (DRAFT)
    API-->>GV: 201 Created

    GV->>API: POST /workflow/{id}/transition {SUBMIT}
    API->>WF: executeTransition(SUBMIT)
    WF->>DB: UPDATE state → FC_OUTLINE_REVIEW
    WF->>DB: INSERT workflow_log
    API-->>GV: OK

    actor QLK as Quản lý khoa
    QLK->>API: POST /council/faculty/{id}/assign
    API->>DB: INSERT council + members

    actor TV as Thành viên HĐ
    TV->>API: POST /evaluations/{id}/submit
    API->>DB: UPDATE eval state → SUBMITTED

    actor TK as Thư ký HĐ
    TK->>API: POST /workflow/{id}/transition {FINALIZE}
    API->>WF: validate(all SUBMITTED ✓)
    TK->>API: POST /workflow/{id}/transition {APPROVE}
    WF->>DB: UPDATE state → SC_OUTLINE_REVIEW
    API-->>TK: OK
```

---

## Hình 3.3 – Biểu đồ trình tự: Xác thực JWT (Mục 1.4.1 / 3.2.1)

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant FE as React
    participant G as JwtAuthGuard
    participant API as NestJS
    participant DB as PostgreSQL

    U->>FE: Nhập email + password
    FE->>API: POST /auth/login
    API->>DB: SELECT user
    API->>API: bcrypt.compare()
    API->>DB: INSERT refresh_token
    API-->>FE: {accessToken, refreshToken}

    U->>FE: Xem đề tài
    FE->>G: GET /proposals\nAuthorization: Bearer {token}
    G->>G: Verify JWT
    G->>API: request.user = payload
    API->>DB: SELECT proposals
    API-->>FE: 200 {data}

    Note over FE,API: Khi token hết hạn
    FE->>API: POST /auth/refresh
    API-->>FE: {newAccessToken}
```

---

## Hình 3.4 – Biểu đồ triển khai Docker (Mục 3.5.1)

```mermaid
graph LR
    User["Người dùng\n(Trình duyệt)"]

    subgraph Docker["Docker Compose"]
        FE["frontend\nnginx:alpine\nPort 80"]
        BE["backend\nnode:20-alpine\nPort 4000"]
        DB[("db\npostgres:15\nPort 5432")]
    end

    User -->|HTTP :80| FE
    FE -->|proxy /api| BE
    BE -->|Prisma| DB

    style Docker fill:#e3f2fd,stroke:#1565c0
    style FE fill:#c8e6c9,stroke:#2e7d32
    style BE fill:#f3e5f5,stroke:#7b1fa2
    style DB fill:#fff3e0,stroke:#e65100
```

---

## Hình 3.5 – Ma trận phân quyền RBAC (Mục 1.4.2 / 3.2)

```mermaid
graph LR
    subgraph Roles
        R1[GIANG_VIEN]
        R2[QUAN_LY_KHOA]
        R3[PHONG_KHCN]
        R4[BAN_GIAM_HOC]
    end
    subgraph Actions
        A1[SUBMIT · RESUBMIT\nCANCEL · WITHDRAW]
        A2[APPROVE · RETURN\nFINALIZE · ASSIGN_COUNCIL]
        A3[PAUSE · RESUME\nASSIGN_COUNCIL]
        A4[APPROVE · REJECT]
    end

    R1 --> A1
    R2 --> A2
    R3 --> A3
    R4 --> A4

    style R1 fill:#4caf50,color:#fff
    style R2 fill:#2196f3,color:#fff
    style R3 fill:#9c27b0,color:#fff
    style R4 fill:#f44336,color:#fff
```

---

## Tổng hợp danh sách hình

| Số hình | Tiêu đề | Mục báo cáo | Trang ước lượng |
|---------|---------|-------------|-----------------|
| Hình 1.1 | Mô hình State Machine tổng quát | 1.2.3 | Chương 1 |
| Hình 2.1 | Biểu đồ Use Case | 2.3.1 | Chương 2 |
| Hình 2.2 | Biểu đồ trạng thái – Luồng chính | 2.3.2 | Chương 2 |
| Hình 2.3 | Biểu đồ trạng thái – Luồng ngoại lệ | 2.3.2 | Chương 2 |
| Hình 2.4 | Biểu đồ ERD các bảng chính | 2.3.3 | Chương 2 |
| Hình 2.5 | Kiến trúc hệ thống 3 tầng | 2.3.4 | Chương 2 |
| Hình 2.6 | Hoạt động: Quy trình xét duyệt đề cương | 2.3.2 | Chương 2 |
| Hình 3.1 | Cấu trúc module Backend | 3.1.2 | Chương 3 |
| Hình 3.2 | Trình tự: Xét duyệt hội đồng | 3.2.3 | Chương 3 |
| Hình 3.3 | Trình tự: Xác thực JWT | 3.2.1 | Chương 3 |
| Hình 3.4 | Triển khai Docker | 3.5.1 | Chương 3 |
| Hình 3.5 | Ma trận phân quyền RBAC | 1.4.2 | Chương 3 |
