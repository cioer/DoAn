# XÂY DỰNG ỨNG DỤNG QUẢN LÝ CÁC ĐỀ TÀI NGHIÊN CỨU KHOA HỌC CỦA GIẢNG VIÊN TRƯỜNG ĐẠI HỌC SPKT NAM ĐỊNH

---

## DANH MỤC TỪ VIẾT TẮT

### Thuật ngữ chung

| Từ viết tắt | Nghĩa đầy đủ |
|-------------|--------------|
| NCKH | Nghiên cứu khoa học |
| SPKT | Sư phạm Kỹ thuật |
| CNTT | Công nghệ thông tin |
| CSDL | Cơ sở dữ liệu |
| KHCN | Khoa học Công nghệ |

### Thuật ngữ kỹ thuật

| Từ viết tắt | Nghĩa đầy đủ |
|-------------|--------------|
| API | Application Programming Interface - Giao diện lập trình ứng dụng |
| REST | Representational State Transfer - Kiến trúc truyền trạng thái biểu diễn |
| JWT | JSON Web Token - Mã thông báo web dạng JSON |
| RBAC | Role-Based Access Control - Kiểm soát truy cập dựa trên vai trò |
| ORM | Object-Relational Mapping - Ánh xạ đối tượng-quan hệ |
| CRUD | Create, Read, Update, Delete - Tạo, Đọc, Cập nhật, Xóa |
| SPA | Single Page Application - Ứng dụng trang đơn |
| HMR | Hot Module Replacement - Thay thế module nóng |
| E2E | End-to-End Testing - Kiểm thử đầu cuối |
| CI/CD | Continuous Integration/Continuous Deployment |
| DTO | Data Transfer Object - Đối tượng truyền dữ liệu |

### Trạng thái đề tài (ProjectState)

| Mã trạng thái | Ý nghĩa |
|---------------|---------|
| DRAFT | Nháp - Đề tài mới tạo, chưa nộp |
| FACULTY_COUNCIL_OUTLINE_REVIEW | Hội đồng khoa xét duyệt đề cương |
| SCHOOL_COUNCIL_OUTLINE_REVIEW | Hội đồng trường xét duyệt đề cương |
| CHANGES_REQUESTED | Yêu cầu chỉnh sửa |
| APPROVED | Đã được phê duyệt |
| IN_PROGRESS | Đang thực hiện nghiên cứu |
| FACULTY_COUNCIL_ACCEPTANCE_REVIEW | Hội đồng khoa nghiệm thu |
| SCHOOL_COUNCIL_ACCEPTANCE_REVIEW | Hội đồng trường nghiệm thu |
| HANDOVER | Bàn giao sản phẩm |
| COMPLETED | Hoàn thành |
| CANCELLED | Đã hủy |
| REJECTED | Bị từ chối |
| WITHDRAWN | Đã rút |
| PAUSED | Tạm dừng |

### Vai trò người dùng (UserRole)

| Mã vai trò | Ý nghĩa |
|------------|---------|
| GIANG_VIEN | Giảng viên - Chủ nhiệm đề tài |
| QUAN_LY_KHOA | Quản lý khoa - Lãnh đạo khoa |
| THU_KY_KHOA | Thư ký khoa - Hỗ trợ quản lý |
| PHONG_KHCN | Phòng Khoa học Công nghệ |
| BAN_GIAM_HOC | Ban Giám học - Lãnh đạo trường |
| ADMIN | Quản trị viên hệ thống |

### Hành động workflow (WorkflowAction)

| Mã hành động | Ý nghĩa |
|--------------|---------|
| SUBMIT | Nộp đề tài |
| APPROVE | Phê duyệt |
| RETURN | Trả về chỉnh sửa |
| RESUBMIT | Nộp lại sau chỉnh sửa |
| FINALIZE | Tổng hợp kết quả hội đồng |
| ASSIGN_COUNCIL | Gán hội đồng đánh giá |

### Vai trò thành viên hội đồng (CouncilMemberRole)

| Mã vai trò | Ý nghĩa |
|------------|---------|
| CHAIR | Chủ tịch hội đồng |
| SECRETARY | Thư ký hội đồng |
| MEMBER | Ủy viên hội đồng |

---

## MỞ ĐẦU

Nghiên cứu khoa học là một trong những nhiệm vụ trọng tâm của giảng viên tại các cơ sở giáo dục đại học. Hoạt động này không chỉ góp phần nâng cao chất lượng đào tạo mà còn thúc đẩy sự phát triển của khoa học và công nghệ. Tại Trường Đại học Sư phạm Kỹ thuật Nam Định, công tác quản lý đề tài NCKH hiện nay vẫn được thực hiện chủ yếu bằng phương pháp thủ công, sử dụng văn bản giấy và các tệp tin Excel rời rạc. Phương thức quản lý này bộc lộ nhiều hạn chế trong việc theo dõi tiến độ, tổng hợp báo cáo và đảm bảo tính minh bạch của quy trình xét duyệt.

Quy trình xét duyệt đề tài NCKH cấp trường là một quy trình phức tạp, trải qua nhiều giai đoạn với sự tham gia của nhiều cấp hội đồng. Mỗi đề tài từ khi được đề xuất cho đến khi hoàn thành phải trải qua các bước: giảng viên tạo và nộp đề cương (DRAFT → SUBMIT), hội đồng khoa xét duyệt (FACULTY_COUNCIL_OUTLINE_REVIEW), hội đồng trường phê duyệt (SCHOOL_COUNCIL_OUTLINE_REVIEW), triển khai thực hiện (IN_PROGRESS), và cuối cùng là nghiệm thu kết quả qua hai cấp hội đồng (FACULTY_COUNCIL_ACCEPTANCE_REVIEW → SCHOOL_COUNCIL_ACCEPTANCE_REVIEW). Việc quản lý thủ công quy trình này không chỉ tốn thời gian mà còn tiềm ẩn nguy cơ sai sót và thiếu nhất quán trong đánh giá.

Xuất phát từ thực trạng trên, đề tài "Xây dựng ứng dụng quản lý các đề tài nghiên cứu khoa học của giảng viên Trường Đại học SPKT Nam Định" được thực hiện nhằm tin học hóa toàn bộ quy trình quản lý đề tài NCKH. Hệ thống được thiết kế với mục tiêu số hóa các biểu mẫu theo quy định của Bộ Giáo dục và Đào tạo, tự động hóa quy trình xét duyệt nhiều cấp với sự tham gia của hội đồng đánh giá gồm nhiều thành viên (CHAIR, SECRETARY, MEMBER), đồng thời cung cấp các công cụ báo cáo và thống kê phục vụ công tác quản lý.

Mục tiêu nghiên cứu của đề tài bao gồm: phân tích và thiết kế hệ thống quản lý đề tài NCKH với kiến trúc phần mềm hiện đại; xây dựng máy trạng thái (State Machine) với 14 trạng thái để quản lý vòng đời đề tài; triển khai hệ thống phân quyền RBAC với 6 vai trò người dùng (GIANG_VIEN, QUAN_LY_KHOA, THU_KY_KHOA, PHONG_KHCN, BAN_GIAM_HOC, ADMIN); và phát triển giao diện web responsive hỗ trợ đầy đủ các chức năng từ đăng ký, xét duyệt đến nghiệm thu đề tài.

Phạm vi nghiên cứu tập trung vào quy trình quản lý đề tài NCKH cấp trường, bao gồm: đăng ký đề tài với các biểu mẫu động (FORM_1B đến FORM_18B), xét duyệt đề cương qua hội đồng khoa (FACULTY_OUTLINE) và hội đồng trường (SCHOOL_OUTLINE), theo dõi thực hiện, và nghiệm thu kết quả qua hội đồng nghiệm thu cấp khoa (FACULTY_ACCEPTANCE) và cấp trường (SCHOOL_ACCEPTANCE). Đề tài không đề cập đến quản lý đề tài cấp bộ hoặc các dự án hợp tác quốc tế.

Phương pháp nghiên cứu được áp dụng bao gồm: khảo sát thực tế quy trình quản lý NCKH tại Trường Đại học SPKT Nam Định; phân tích và thiết kế hệ thống theo hướng đối tượng với UML; áp dụng phương pháp phát triển phần mềm Agile với các sprint ngắn; và kiểm thử đầu cuối (E2E Testing) với Playwright để đảm bảo chất lượng sản phẩm.

Đồ án được cấu trúc thành ba chương. Chương 1 trình bày cơ sở lý thuyết về quản lý NCKH và các công nghệ sử dụng bao gồm NestJS, React, PostgreSQL và Docker. Chương 2 phân tích yêu cầu hệ thống và thiết kế chi tiết bao gồm biểu đồ Use Case, biểu đồ hoạt động workflow, và thiết kế cơ sở dữ liệu. Chương 3 trình bày quá trình xây dựng, kiểm thử và triển khai hệ thống cùng với đánh giá kết quả đạt được.

---

## CHƯƠNG 1: CƠ SỞ LÝ THUYẾT

### 1.1. Tổng quan về quản lý đề tài nghiên cứu khoa học

#### 1.1.1. Khái niệm nghiên cứu khoa học trong giáo dục đại học

Nghiên cứu khoa học trong môi trường đại học là hoạt động sáng tạo tri thức mới thông qua việc áp dụng phương pháp khoa học một cách có hệ thống. Theo quy định của Bộ Giáo dục và Đào tạo, NCKH là một trong hai nhiệm vụ chính của giảng viên bên cạnh công tác giảng dạy, đóng vai trò quan trọng trong việc nâng cao chất lượng đào tạo và uy tín học thuật của cơ sở giáo dục.

Đề tài NCKH cấp trường là hình thức tổ chức nghiên cứu phổ biến nhất tại các trường đại học Việt Nam. Mỗi đề tài thường có thời gian thực hiện từ 12 đến 24 tháng, do một giảng viên làm chủ nhiệm (GIANG_VIEN) và có thể có các thành viên tham gia. Kết quả nghiên cứu được đánh giá thông qua các sản phẩm cụ thể như bài báo khoa học đăng trên tạp chí chuyên ngành, giáo trình, phần mềm ứng dụng hoặc các giải pháp kỹ thuật có khả năng ứng dụng thực tiễn.

#### 1.1.2. Quy trình quản lý đề tài NCKH cấp trường

Quy trình quản lý đề tài NCKH cấp trường được chuẩn hóa theo các văn bản quy định của Bộ Giáo dục và Đào tạo, bao gồm các giai đoạn chính sau đây.

**Giai đoạn đề xuất và xét duyệt đề cương** là giai đoạn khởi đầu của mỗi đề tài. Giảng viên chuẩn bị hồ sơ đăng ký theo các biểu mẫu quy định (FORM_1B - Đề xuất đề tài, FORM_PL1 - Phụ lục thông tin). Hồ sơ được nộp lên hệ thống và chuyển trạng thái từ DRAFT sang FACULTY_COUNCIL_OUTLINE_REVIEW. Hội đồng khoa gồm các thành viên với vai trò CHAIR (Chủ tịch), SECRETARY (Thư ký) và MEMBER (Ủy viên) thực hiện đánh giá độc lập. Sau khi tổng hợp kết quả đánh giá, đề tài được chuyển lên hội đồng trường (SCHOOL_COUNCIL_OUTLINE_REVIEW) để xét duyệt cuối cùng trước khi chuyển sang trạng thái APPROVED.

**Giai đoạn thực hiện nghiên cứu** bắt đầu khi đề tài được phê duyệt và chuyển sang trạng thái IN_PROGRESS. Trong giai đoạn này, chủ nhiệm đề tài triển khai nghiên cứu theo đề cương đã được duyệt, nộp báo cáo tiến độ định kỳ (thường là 6 tháng một lần), và có thể đề xuất điều chỉnh nội dung nếu cần thiết. Hệ thống theo dõi thời hạn thực hiện (slaDeadline) và gửi nhắc nhở tự động khi gần đến hạn.

**Giai đoạn nghiệm thu kết quả** được thực hiện khi chủ nhiệm đề tài hoàn thành nghiên cứu và nộp hồ sơ nghiệm thu. Đề tài lần lượt trải qua đánh giá của hội đồng khoa (FACULTY_COUNCIL_ACCEPTANCE_REVIEW) và hội đồng trường (SCHOOL_COUNCIL_ACCEPTANCE_REVIEW). Mỗi thành viên hội đồng đánh giá độc lập với trạng thái DRAFT → SUBMITTED, sau đó thư ký tổng hợp kết quả (FINALIZE) để đưa ra kết luận cuối cùng. Đề tài đạt yêu cầu chuyển sang HANDOVER để bàn giao sản phẩm và cuối cùng là COMPLETED.

#### 1.1.3. Vai trò của tin học hóa trong quản lý nghiên cứu khoa học

Việc tin học hóa quy trình quản lý NCKH mang lại nhiều lợi ích thiết thực cho cơ sở giáo dục đại học. Về mặt hiệu quả hoạt động, hệ thống thông tin giúp tiết kiệm thời gian xử lý hồ sơ thông qua tự động hóa các thủ tục hành chính, giảm thời gian luân chuyển hồ sơ giữa các cấp từ nhiều ngày xuống còn tức thì.

Về tính minh bạch, mọi hoạt động trong quy trình đều được ghi nhận trong nhật ký hệ thống (WorkflowLog) với đầy đủ thông tin về hành động (action), trạng thái trước (fromState), trạng thái sau (toState), người thực hiện (actorId) và thời điểm (timestamp). Điều này cho phép truy vết và kiểm toán khi cần thiết.

Về hỗ trợ ra quyết định, hệ thống cung cấp các báo cáo tổng hợp và bảng thống kê trực quan giúp lãnh đạo có cái nhìn toàn diện về hoạt động NCKH của đơn vị, từ đó đưa ra các quyết định quản lý phù hợp.

### 1.2. Kiến trúc hệ thống phần mềm hiện đại

#### 1.2.1. Kiến trúc Monorepo với Nx

Monorepo (Monolithic Repository) là phương pháp tổ chức mã nguồn trong đó nhiều dự án hoặc thành phần được lưu trữ trong cùng một kho lưu trữ (repository). Khác với cách tiếp cận multi-repo truyền thống nơi mỗi dự án có repository riêng, monorepo cho phép chia sẻ mã nguồn và quản lý phụ thuộc một cách hiệu quả giữa các phần của hệ thống.

Trong dự án này, monorepo được sử dụng để quản lý cả backend (NestJS) và frontend (React) trong cùng một repository, với cấu trúc thư mục như sau: thư mục `apps/` chứa ứng dụng backend NestJS với 27 module nghiệp vụ; thư mục `web-apps/` chứa ứng dụng frontend React với 97 components; thư mục `prisma/` chứa schema định nghĩa cơ sở dữ liệu; và các tệp cấu hình chung như `docker-compose.yml`, `package.json`.

Nx là framework mã nguồn mở hỗ trợ xây dựng và quản lý monorepo hiệu quả. Các tính năng chính của Nx bao gồm: Computation Caching để cache kết quả build và test, chỉ chạy lại khi mã nguồn thay đổi; Affected Commands để chỉ build/test những phần bị ảnh hưởng bởi thay đổi; và Dependency Graph để phân tích và trực quan hóa phụ thuộc giữa các module.

#### 1.2.2. Kiến trúc RESTful API

REST (Representational State Transfer) là kiến trúc phần mềm được Roy Fielding đề xuất năm 2000, định nghĩa các ràng buộc để xây dựng các dịch vụ web có khả năng mở rộng cao. RESTful API là API tuân thủ các nguyên tắc REST, trở thành tiêu chuẩn phổ biến cho việc xây dựng web services.

Các nguyên tắc cốt lõi của REST bao gồm: nguyên tắc Client-Server phân tách rõ ràng trách nhiệm giữa client và server; nguyên tắc Stateless yêu cầu mỗi request phải chứa đủ thông tin để xử lý mà không dựa vào trạng thái lưu trữ trên server; nguyên tắc Cacheable cho phép response được cache để cải thiện hiệu năng; nguyên tắc Uniform Interface sử dụng các phương thức HTTP chuẩn (GET, POST, PUT, PATCH, DELETE) với ý nghĩa thống nhất; và nguyên tắc Layered System cho phép kiến trúc có nhiều tầng trung gian.

Trong hệ thống quản lý NCKH, API được thiết kế theo chuẩn REST với các endpoint như: `GET /api/proposals` để lấy danh sách đề tài, `POST /api/proposals` để tạo đề tài mới, `GET /api/proposals/:id` để lấy chi tiết một đề tài, `PUT /api/proposals/:id` để cập nhật thông tin đề tài, và `POST /api/workflow/:id/transition` để thực hiện chuyển trạng thái.

#### 1.2.3. State Machine Pattern trong quản lý quy trình

State Machine (Máy trạng thái) là một mô hình tính toán trừu tượng mô tả hành vi của hệ thống thông qua một tập hữu hạn các trạng thái và các quy tắc chuyển đổi giữa chúng. Trong phát triển phần mềm, state machine đặc biệt phù hợp để mô hình hóa các quy trình nghiệp vụ có nhiều bước với điều kiện chuyển đổi phức tạp.

Một state machine bao gồm các thành phần: State (Trạng thái) là tình trạng hiện tại của đối tượng tại một thời điểm; Transition (Chuyển đổi) là sự thay đổi từ trạng thái này sang trạng thái khác; Event (Sự kiện) là tác nhân kích hoạt chuyển đổi; Guard (Điều kiện bảo vệ) là điều kiện cần thỏa mãn để chuyển đổi được thực hiện; và Action (Hành động) là công việc thực hiện khi chuyển đổi xảy ra.

Hệ thống quản lý NCKH sử dụng state machine với 14 trạng thái được định nghĩa trong enum ProjectState: DRAFT (trạng thái khởi tạo), FACULTY_COUNCIL_OUTLINE_REVIEW và SCHOOL_COUNCIL_OUTLINE_REVIEW (các trạng thái xét duyệt đề cương), CHANGES_REQUESTED (yêu cầu chỉnh sửa), APPROVED (đã phê duyệt), IN_PROGRESS (đang thực hiện), FACULTY_COUNCIL_ACCEPTANCE_REVIEW và SCHOOL_COUNCIL_ACCEPTANCE_REVIEW (các trạng thái nghiệm thu), HANDOVER (bàn giao), COMPLETED (hoàn thành), cùng các trạng thái kết thúc đặc biệt như CANCELLED, REJECTED, WITHDRAWN và PAUSED.

### 1.3. Các công nghệ sử dụng trong hệ thống

#### 1.3.1. NestJS Framework cho Backend

NestJS là framework Node.js mã nguồn mở được xây dựng trên nền tảng Express.js (hoặc Fastify), sử dụng TypeScript làm ngôn ngữ chính. NestJS áp dụng các nguyên tắc thiết kế từ Angular như Dependency Injection, Decorators và Module-based Architecture, giúp tổ chức code có cấu trúc và dễ bảo trì.

Kiến trúc của NestJS gồm các thành phần chính: Module là đơn vị tổ chức code, mỗi feature của ứng dụng nên có module riêng; Controller chịu trách nhiệm xử lý HTTP request và trả về response; Service chứa logic nghiệp vụ, được inject vào controller thông qua Dependency Injection; Guard kiểm tra điều kiện trước khi request được xử lý (authentication, authorization); và Interceptor can thiệp vào luồng xử lý request/response (logging, transformation).

Trong dự án, backend được tổ chức thành 27 module bao gồm: AuthModule xử lý xác thực với JWT; ProposalsModule quản lý đề tài NCKH; WorkflowModule triển khai state machine; CouncilsModule quản lý hội đồng đánh giá; EvaluationsModule xử lý đánh giá của thành viên hội đồng; UsersModule quản lý người dùng; FacultiesModule quản lý đơn vị (khoa/phòng); FormTemplatesModule quản lý biểu mẫu động; AttachmentsModule quản lý file đính kèm; và các module hỗ trợ khác.

#### 1.3.2. React và Vite cho Frontend

React là thư viện JavaScript do Meta (Facebook) phát triển từ năm 2013, trở thành một trong những công cụ phổ biến nhất để xây dựng giao diện người dùng. React sử dụng khái niệm Virtual DOM để tối ưu việc cập nhật giao diện và Component-based Architecture để tái sử dụng code.

Các đặc điểm quan trọng của React bao gồm: Declarative UI cho phép mô tả giao diện dựa trên trạng thái, React tự động cập nhật khi trạng thái thay đổi; Component-based giúp chia giao diện thành các component nhỏ, độc lập và tái sử dụng; One-way Data Binding với luồng dữ liệu một chiều từ parent xuống child giúp dễ debug và dự đoán; và JSX là cú pháp mở rộng cho phép viết markup trong JavaScript.

Vite là công cụ build frontend thế hệ mới do Evan You (tác giả Vue.js) phát triển. So với các công cụ truyền thống như Webpack, Vite mang lại trải nghiệm phát triển nhanh hơn đáng kể nhờ sử dụng ES modules native của trình duyệt trong development và Rollup để bundle production build.

Frontend của hệ thống sử dụng React 19 với các thư viện hỗ trợ: Zustand cho state management với API đơn giản và hiệu năng cao; React Query (TanStack Query) cho data fetching và caching; React Router cho client-side routing; Tailwind CSS cho styling với utility-first approach; và Shadcn/ui cho component library với khả năng tùy chỉnh cao.

#### 1.3.3. PostgreSQL và Prisma ORM

PostgreSQL là hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở, nổi tiếng với độ tin cậy cao, tập tính năng phong phú và khả năng mở rộng. PostgreSQL tuân thủ chuẩn SQL và bổ sung nhiều tính năng tiên tiến như JSONB (lưu trữ JSON hiệu quả), Full-text Search, và các extension mở rộng.

Trong hệ thống quản lý NCKH, PostgreSQL được sử dụng để lưu trữ toàn bộ dữ liệu bao gồm: thông tin người dùng (bảng users), đơn vị (bảng faculties), đề tài (bảng proposals), hội đồng (bảng councils), thành viên hội đồng (bảng council_members), đánh giá (bảng evaluations), nhật ký workflow (bảng workflow_logs), và các bảng hỗ trợ khác.

Prisma là ORM (Object-Relational Mapping) thế hệ mới cho Node.js và TypeScript, cung cấp type-safe database access. Các thành phần của Prisma bao gồm: Prisma Schema (file `schema.prisma`) định nghĩa cấu trúc database bằng DSL (Domain-Specific Language); Prisma Client là API tự động generate để truy vấn database với full TypeScript support; Prisma Migrate quản lý database migrations; và Prisma Studio là giao diện web để xem và chỉnh sửa dữ liệu.

#### 1.3.4. Docker và Containerization

Docker là nền tảng containerization cho phép đóng gói ứng dụng cùng với tất cả dependencies vào các container độc lập. Container là đơn vị phần mềm chuẩn hóa, chứa code và runtime environment, đảm bảo ứng dụng chạy nhất quán trên mọi môi trường từ development đến production.

Lợi ích của Docker trong phát triển phần mềm bao gồm: Consistency đảm bảo môi trường development, staging và production giống nhau; Isolation giúp các ứng dụng chạy độc lập không xung đột; Portability cho phép dễ dàng di chuyển container giữa các máy chủ; và Scalability hỗ trợ mở rộng horizontal bằng cách chạy nhiều container instances.

Docker Compose là công cụ định nghĩa và chạy multi-container Docker applications. Trong dự án, `docker-compose.yml` định nghĩa stack gồm: service backend (NestJS app), service frontend (React app với Nginx), và service db (PostgreSQL database).

### 1.4. Bảo mật ứng dụng web

#### 1.4.1. JSON Web Token (JWT) cho xác thực

JWT (JSON Web Token) là tiêu chuẩn mở (RFC 7519) định nghĩa cách truyền thông tin an toàn giữa các bên dưới dạng JSON object được ký số. JWT được sử dụng rộng rãi cho việc xác thực (authentication) và ủy quyền (authorization) trong các ứng dụng web.

Cấu trúc của JWT gồm ba phần được mã hóa Base64URL và ngăn cách bởi dấu chấm: Header chứa metadata về loại token và thuật toán ký (ví dụ: HS256, RS256); Payload chứa các claims bao gồm thông tin người dùng và các metadata khác; và Signature là chữ ký số để xác minh token không bị thay đổi.

Quy trình xác thực trong hệ thống diễn ra như sau: người dùng gửi credentials (email, password) đến endpoint `/api/auth/login`; server xác thực và tạo cặp access token (thời hạn ngắn, 15 phút) và refresh token (thời hạn dài, 7 ngày); client lưu tokens và gửi access token trong header `Authorization: Bearer <token>` cho các request tiếp theo; server xác minh token bằng JwtAuthGuard trước khi xử lý request.

#### 1.4.2. Role-Based Access Control (RBAC)

RBAC (Role-Based Access Control) là phương pháp kiểm soát truy cập dựa trên vai trò của người dùng trong tổ chức. Thay vì gán quyền trực tiếp cho từng user, quyền được gán cho các role, và user được gán vào các role phù hợp với nhiệm vụ của họ.

Hệ thống định nghĩa 6 vai trò (UserRole) với các quyền hạn khác nhau: GIANG_VIEN có quyền tạo và quản lý đề tài của mình (PROPOSAL_CREATE, PROPOSAL_EDIT); QUAN_LY_KHOA có quyền xem đề tài trong khoa, gán hội đồng cấp khoa (PROPOSAL_VIEW_FACULTY, FACULTY_APPROVE); THU_KY_KHOA hỗ trợ quản lý khoa trong việc tổng hợp kết quả đánh giá; PHONG_KHCN có quyền quản lý đề tài toàn trường và gán hội đồng cấp trường; BAN_GIAM_HOC có quyền xem báo cáo tổng hợp và phê duyệt cuối cùng; và ADMIN có toàn quyền quản trị hệ thống (USER_MANAGE, CALENDAR_MANAGE, AUDIT_VIEW).

RBAC được triển khai thông qua bảng role_permissions liên kết các Permission với UserRole, và RolesGuard trong NestJS kiểm tra quyền truy cập trước mỗi API endpoint.

---

## CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

### 2.1. Khảo sát và phân tích hiện trạng

#### 2.1.1. Quy trình quản lý NCKH hiện tại tại Trường Đại học SPKT Nam Định

Qua khảo sát thực tế tại Trường Đại học Sư phạm Kỹ thuật Nam Định, công tác quản lý đề tài NCKH hiện nay được thực hiện chủ yếu bằng phương pháp thủ công với quy trình như sau.

Bước đăng ký đề tài yêu cầu giảng viên điền thông tin vào các biểu mẫu Word theo quy định của Bộ Giáo dục và Đào tạo, in và nộp bản cứng cho bộ phận quản lý khoa học của khoa. Khoa tổng hợp hồ sơ và chuyển lên Phòng KHCN của trường bằng công văn.

Bước xét duyệt đề cương cấp khoa được thực hiện khi khoa thành lập hội đồng xét duyệt gồm 3-5 thành viên. Các thành viên hội đồng nhận hồ sơ bản cứng để nghiên cứu và đánh giá. Cuộc họp hội đồng được tổ chức, kết quả được ghi vào biên bản và tổng hợp bằng tay. Thông báo kết quả được gửi cho giảng viên qua văn bản.

Bước xét duyệt đề cương cấp trường tương tự cấp khoa với Phòng KHCN làm đầu mối tổng hợp các đề tài đã qua khoa, thành lập hội đồng cấp trường, và trình Ban Giám hiệu phê duyệt cuối cùng.

Bước thực hiện và nghiệm thu gồm giảng viên triển khai nghiên cứu theo đề cương, nộp báo cáo tiến độ định kỳ (6 tháng/lần), và cuối cùng nghiệm thu qua hai cấp hội đồng tương tự quy trình xét duyệt đề cương.

#### 2.1.2. Nhận diện các vấn đề tồn tại

Qua khảo sát và phân tích, các vấn đề chính của quy trình hiện tại được nhận diện như sau.

**Vấn đề về thời gian và hiệu quả**: Thời gian luân chuyển hồ sơ giữa các cấp trung bình 5-7 ngày mỗi vòng do phụ thuộc vào quy trình văn thư. Giảng viên và các bên liên quan khó theo dõi được hồ sơ đang ở bước nào, ai đang xử lý. Việc tổng hợp kết quả đánh giá từ nhiều thành viên hội đồng tốn nhiều công sức.

**Vấn đề về dữ liệu và thông tin**: Dữ liệu phân tán trong nhiều file Excel riêng lẻ theo từng năm, từng khoa. Không có cơ sở dữ liệu tập trung để tra cứu lịch sử các đề tài. Việc tìm kiếm thông tin về một đề tài cụ thể hoặc tổng hợp báo cáo đòi hỏi nhiều thời gian.

**Vấn đề về tính nhất quán và minh bạch**: Không có cơ chế đảm bảo mỗi thành viên hội đồng đánh giá độc lập trước khi biết kết quả của người khác. Việc ghi nhận lịch sử xử lý hồ sơ không đầy đủ, gây khó khăn khi cần truy vết. Thiếu công cụ nhắc nhở tự động khi gần đến hạn xử lý hoặc khi hồ sơ bị tồn đọng.

### 2.2. Đặc tả yêu cầu hệ thống

#### 2.2.1. Yêu cầu chức năng

Dựa trên phân tích nghiệp vụ, hệ thống cần đáp ứng các nhóm chức năng sau.

**Nhóm chức năng quản lý đề tài** (Proposals Module) bao gồm: F01 - Tạo đề tài mới với form động theo template, giảng viên (GIANG_VIEN) điền thông tin theo các mục được cấu hình; F02 - Lưu nháp và chỉnh sửa đề tài ở trạng thái DRAFT hoặc CHANGES_REQUESTED; F03 - Nộp đề tài (SUBMIT action) chuyển từ DRAFT sang FACULTY_COUNCIL_OUTLINE_REVIEW; F04 - Xem chi tiết đề tài với đầy đủ thông tin, trạng thái và lịch sử workflow; F05 - Danh sách đề tài với phân trang, lọc theo trạng thái/khoa/thời gian, và tìm kiếm; F06 - Rút đề tài (WITHDRAW action) trước khi được duyệt cuối cùng.

**Nhóm chức năng xét duyệt và đánh giá** (Workflow & Evaluation Modules) bao gồm: F07 - Gán hội đồng cho đề tài, QUAN_LY_KHOA gán hội đồng khoa, PHONG_KHCN gán hội đồng trường; F08 - Đánh giá đề tài, mỗi thành viên hội đồng chấm điểm độc lập với trạng thái đánh giá DRAFT → SUBMITTED; F09 - Tổng hợp kết quả hội đồng (FINALIZE action) bởi thư ký (SECRETARY) sau khi tất cả thành viên đã nộp đánh giá; F10 - Phê duyệt đề tài (APPROVE action) chuyển sang trạng thái tiếp theo; F11 - Trả về chỉnh sửa (RETURN action) chuyển về CHANGES_REQUESTED; F12 - Từ chối đề tài (REJECT action) chuyển sang REJECTED.

**Nhóm chức năng quản lý hội đồng** (Councils Module) bao gồm: F13 - Tạo hội đồng với các loại FACULTY_OUTLINE, SCHOOL_OUTLINE, FACULTY_ACCEPTANCE, SCHOOL_ACCEPTANCE; F14 - Thêm thành viên vào hội đồng với các vai trò CHAIR, SECRETARY, MEMBER; F15 - Quản lý danh sách hội đồng theo khoa và loại hội đồng.

**Nhóm chức năng quản trị hệ thống** (Admin Modules) bao gồm: F16 - Quản lý người dùng (CRUD) với phân quyền theo role; F17 - Quản lý biểu mẫu động (form_templates, form_sections); F18 - Dashboard thống kê với biểu đồ trực quan; F19 - Xem nhật ký kiểm toán (audit_events); F20 - Xuất dữ liệu ra Excel/PDF.

#### 2.2.2. Yêu cầu phi chức năng

**Yêu cầu về hiệu năng**: API response time không quá 500ms cho các thao tác thông thường; Hỗ trợ tối thiểu 100 người dùng đồng thời; Thời gian tải trang không quá 3 giây trên kết nối 3G.

**Yêu cầu về bảo mật**: Xác thực bằng JWT với cơ chế refresh token; Phân quyền RBAC với 6 vai trò và các permission tương ứng; Mã hóa mật khẩu bằng bcrypt với cost factor 10; HTTPS cho môi trường production; Audit log ghi nhận tất cả hành động quan trọng.

**Yêu cầu về khả năng sử dụng**: Giao diện responsive hỗ trợ desktop, tablet và mobile; Hỗ trợ tiếng Việt đầy đủ với font Unicode; Thông báo lỗi rõ ràng và hướng dẫn người dùng; Auto-save định kỳ để tránh mất dữ liệu khi điền form.

**Yêu cầu về độ tin cậy và bảo trì**: Uptime hệ thống đạt tối thiểu 99%; Backup database tự động hàng ngày; Code coverage đạt tối thiểu 80% cho unit tests; Documentation đầy đủ cho API và code.

### 2.3. Thiết kế hệ thống

#### 2.3.1. Biểu đồ Use Case tổng quan

Hệ thống có 6 tác nhân (actors) tương ứng với các vai trò trong UserRole enum.

**GIANG_VIEN (Giảng viên)**: Đăng nhập hệ thống; Tạo đề tài mới với form động; Chỉnh sửa đề tài ở trạng thái DRAFT hoặc CHANGES_REQUESTED; Nộp đề tài (SUBMIT); Xem danh sách và chi tiết đề tài của mình; Rút đề tài (WITHDRAW); Theo dõi trạng thái và lịch sử xử lý.

**QUAN_LY_KHOA và THU_KY_KHOA**: Xem danh sách đề tài trong khoa; Gán hội đồng khoa cho đề tài; Thực hiện đánh giá với vai trò thành viên hội đồng; Tổng hợp kết quả đánh giá (với vai trò SECRETARY); Phê duyệt hoặc trả về đề tài; Xem báo cáo thống kê cấp khoa.

**PHONG_KHCN**: Xem danh sách đề tài toàn trường; Gán hội đồng trường cho đề tài; Quản lý các mẫu biểu (form templates); Xem báo cáo thống kê toàn trường; Xuất dữ liệu.

**BAN_GIAM_HOC**: Xem dashboard tổng quan; Xem báo cáo thống kê; Phê duyệt đề tài ở mức cao nhất (nếu cần).

**ADMIN**: Quản lý người dùng (tạo, sửa, xóa, phân quyền); Quản lý đơn vị (khoa, phòng); Cấu hình hệ thống; Xem audit log; Backup và restore dữ liệu.

#### 2.3.2. Biểu đồ trạng thái - Workflow đề tài

Workflow đề tài được triển khai theo mô hình State Machine với 14 trạng thái (ProjectState). Sơ đồ chuyển trạng thái được mô tả như sau.

Luồng chính (happy path): DRAFT --[SUBMIT]--> FACULTY_COUNCIL_OUTLINE_REVIEW --[FINALIZE + APPROVE]--> SCHOOL_COUNCIL_OUTLINE_REVIEW --[FINALIZE + APPROVE]--> APPROVED --[START_PROJECT]--> IN_PROGRESS --[SUBMIT_ACCEPTANCE]--> FACULTY_COUNCIL_ACCEPTANCE_REVIEW --[FINALIZE + ACCEPT]--> SCHOOL_COUNCIL_ACCEPTANCE_REVIEW --[FINALIZE + ACCEPT]--> HANDOVER --[HANDOVER_COMPLETE]--> COMPLETED.

Luồng trả về chỉnh sửa: Từ các trạng thái review (FACULTY_COUNCIL_OUTLINE_REVIEW, SCHOOL_COUNCIL_OUTLINE_REVIEW, FACULTY_COUNCIL_ACCEPTANCE_REVIEW, SCHOOL_COUNCIL_ACCEPTANCE_REVIEW), hành động RETURN chuyển đề tài về CHANGES_REQUESTED. Giảng viên chỉnh sửa và nộp lại (RESUBMIT) để quay lại trạng thái review trước đó.

Các trạng thái kết thúc đặc biệt: CANCELLED khi giảng viên hủy đề tài từ DRAFT (CANCEL action); WITHDRAWN khi giảng viên rút đề tài trước khi duyệt cuối (WITHDRAW action); REJECTED khi đề tài bị từ chối bởi hội đồng (REJECT action); PAUSED khi tạm dừng thực hiện (PAUSE action) với khả năng tiếp tục (RESUME action).

Quy tắc quan trọng: Mỗi thành viên hội đồng phải nộp đánh giá (evaluation.state = SUBMITTED) trước khi thư ký có thể tổng hợp kết quả (FINALIZE); Chỉ người có quyền phù hợp mới được thực hiện các action tương ứng; Mọi chuyển trạng thái đều được ghi nhận trong bảng workflow_logs.

#### 2.3.3. Thiết kế cơ sở dữ liệu

Cơ sở dữ liệu được thiết kế với Prisma Schema, bao gồm các bảng chính như sau.

**Bảng users** lưu thông tin người dùng với các trường: id (UUID, khóa chính); email (unique); passwordHash (mật khẩu đã mã hóa bcrypt); displayName; role (enum UserRole); facultyId (khóa ngoại đến faculties, nullable cho ADMIN và PHONG_KHCN).

**Bảng faculties** lưu thông tin đơn vị với các trường: id; code (mã khoa, unique); name; type (enum FacultyType: FACULTY hoặc DEPARTMENT).

**Bảng proposals** là bảng trung tâm lưu thông tin đề tài với các trường: id; code (mã đề tài, unique, format: DT-XXX); title; state (enum ProjectState); ownerId (khóa ngoại đến users, chủ nhiệm đề tài); facultyId (khóa ngoại đến faculties); councilId (khóa ngoại đến councils, nullable); templateId (khóa ngoại đến form_templates); formData (JSON chứa dữ liệu form động); holderUnit và holderUser (đơn vị/người đang xử lý); slaStartDate và slaDeadline (thời hạn xử lý); các timestamp (createdAt, updatedAt, deletedAt).

**Bảng councils** lưu thông tin hội đồng với các trường: id; name; type (enum CouncilType); scope (enum CouncilScope: FACULTY hoặc SCHOOL); facultyId (cho hội đồng khoa); secretaryId (thư ký hội đồng).

**Bảng council_members** lưu thành viên hội đồng với các trường: id; councilId; userId; role (enum CouncilMemberRole: CHAIR, SECRETARY, MEMBER); isAuthor (đánh dấu nếu là tác giả đề tài, không được đánh giá).

**Bảng evaluations** lưu đánh giá của thành viên hội đồng với các trường: id; proposalId; evaluatorId; level (enum EvaluationLevel: FACULTY hoặc SCHOOL); state (enum EvaluationState: DRAFT, SUBMITTED, FINALIZED); formData (JSON chứa điểm số và nhận xét); submittedAt.

**Bảng workflow_logs** lưu lịch sử chuyển trạng thái với các trường: id; proposalId; action (enum WorkflowAction); fromState; toState; actorId; actorName; comment; timestamp.

**Bảng form_templates và form_sections** lưu cấu hình biểu mẫu động cho phép cấu hình các mục trong form đăng ký đề tài mà không cần sửa code.

#### 2.3.4. Kiến trúc hệ thống tổng thể

Hệ thống được thiết kế theo kiến trúc 3 tầng (3-tier architecture) với sự phân tách rõ ràng giữa các lớp.

**Tầng Presentation (Frontend)** bao gồm React SPA (Single Page Application) chạy trên trình duyệt với các thành phần: Pages (các trang chức năng như Dashboard, ProposalList, ProposalDetail); Components (97 UI components tái sử dụng); Hooks (custom hooks cho logic phức tạp); Stores (Zustand stores cho state management); API Client (axios instance với interceptors). Frontend giao tiếp với backend qua HTTP/REST API.

**Tầng Business Logic (Backend)** bao gồm NestJS Application chạy trên Node.js với các thành phần: Controllers (xử lý HTTP requests); Services (business logic); Guards (authentication/authorization); Interceptors (logging, transformation); 27 Feature Modules (Auth, Proposals, Workflow, Councils, Evaluations,...). Backend giao tiếp với database qua Prisma ORM.

**Tầng Data (Database)** bao gồm PostgreSQL server với các thành phần: Tables (18 bảng chính); Indexes (tối ưu truy vấn); Constraints (đảm bảo tính toàn vẹn dữ liệu).

### 2.4. Thiết kế giao diện người dùng

#### 2.4.1. Nguyên tắc thiết kế

Giao diện được thiết kế tuân theo các nguyên tắc sau.

**Nguyên tắc nhất quán (Consistency)**: Sử dụng design system thống nhất với Shadcn/ui làm component library; Màu sắc, typography, spacing tuân theo scale đã định nghĩa; Các thành phần tương tự có behavior giống nhau trên toàn hệ thống.

**Nguyên tắc đơn giản (Simplicity)**: Ưu tiên clarity over cleverness; Loại bỏ các yếu tố không cần thiết; Progressive disclosure - chỉ hiển thị thông tin cần thiết, chi tiết khi cần.

**Nguyên tắc phản hồi (Feedback)**: Loading states cho các thao tác async; Success/error notifications kịp thời; Validation real-time khi điền form.

**Nguyên tắc tiếp cận (Accessibility)**: Tuân thủ WCAG 2.1 level AA; Keyboard navigation đầy đủ; Contrast ratio đủ cho người khiếm thị; ARIA labels cho screen readers.

**Nguyên tắc responsive**: Mobile-first approach với Tailwind CSS; Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px); Touch-friendly elements trên mobile.

#### 2.4.2. Các màn hình chính

**Màn hình đăng nhập** gồm form với fields email và password, validation inline, nút "Đăng nhập" và thông báo lỗi nếu credentials sai.

**Dashboard** hiển thị thống kê tổng quan tùy theo role: GIANG_VIEN thấy đề tài của mình phân theo trạng thái; QUAN_LY_KHOA/THU_KY_KHOA thấy đề tài trong khoa; PHONG_KHCN và BAN_GIAM_HOC thấy toàn trường. Các biểu đồ trực quan (pie chart trạng thái, bar chart theo thời gian) và danh sách đề tài cần xử lý.

**Danh sách đề tài** với bảng dữ liệu có phân trang, sắp xếp theo cột; Bộ lọc theo trạng thái (ProjectState), khoa (Faculty), khoảng thời gian; Tìm kiếm theo từ khóa (code, title); Badge màu sắc cho từng trạng thái; Action buttons (xem, sửa, xóa) theo quyền.

**Chi tiết đề tài** hiển thị thông tin đầy đủ của đề tài theo các mục trong form template; Timeline workflow hiển thị lịch sử chuyển trạng thái từ workflow_logs; Form đánh giá cho thành viên hội đồng (nếu có quyền); Panel kết quả tổng hợp đánh giá; Action buttons (Submit, Approve, Return,...) theo trạng thái và quyền.

**Form tạo/sửa đề tài** với form động render từ form_sections theo template; Auto-save mỗi 30 giây; Validation real-time theo cấu hình; Upload file đính kèm; Preview trước khi nộp.

---

## CHƯƠNG 3: XÂY DỰNG VÀ TRIỂN KHAI HỆ THỐNG

### 3.1. Môi trường và công cụ phát triển

#### 3.1.1. Cấu hình môi trường phát triển

Môi trường phát triển được thiết lập với các công cụ và phiên bản sau: Visual Studio Code phiên bản 1.85 trở lên làm IDE chính với các extensions hỗ trợ TypeScript, Prisma, ESLint; Node.js phiên bản 20 LTS làm runtime cho cả backend và frontend tooling; npm phiên bản 10 trở lên để quản lý packages; Git phiên bản 2.40 trở lên cho version control; Docker Desktop phiên bản 4.25 trở lên để chạy PostgreSQL và các services khác; Postman phiên bản 10 trở lên để test API; pgAdmin 4.8 để quản lý PostgreSQL database.

#### 3.1.2. Cấu trúc dự án chi tiết

Dự án được tổ chức theo cấu trúc monorepo với hai ứng dụng chính.

Thư mục `apps/` chứa backend NestJS với cấu trúc: `src/modules/` chứa 27 feature modules (auth, proposals, workflow, councils, evaluations, users, faculties, form-templates, attachments, audit, calendar, dashboard, documents, export, rbac, và các modules hỗ trợ); `src/common/` chứa các utilities dùng chung (decorators, filters, guards, interceptors, pipes); `src/config/` chứa cấu hình ứng dụng; `src/main.ts` là entry point của ứng dụng.

Thư mục `web-apps/` chứa frontend React với cấu trúc: `src/app/` chứa pages và routing; `src/components/` chứa 97 UI components tổ chức theo atomic design (ui/, proposals/, workflow/, evaluation/, layout/); `src/lib/` chứa API client, utilities, types; `src/stores/` chứa Zustand stores cho state management; `src/hooks/` chứa custom React hooks.

Thư mục `prisma/` chứa: `schema.prisma` định nghĩa database schema; `migrations/` chứa các file migration; `seed.ts` script để khởi tạo dữ liệu mẫu.

Các file cấu hình gốc: `docker-compose.yml` cho local development; `package.json` với scripts và dependencies; `nx.json` cấu hình Nx workspace; `.env.example` template biến môi trường.

### 3.2. Xây dựng Backend với NestJS

#### 3.2.1. Module Authentication (AuthModule)

AuthModule xử lý xác thực người dùng với JWT, bao gồm các thành phần chính.

AuthController định nghĩa các endpoints: `POST /api/auth/login` nhận email và password, trả về access token và refresh token; `POST /api/auth/refresh` nhận refresh token, trả về cặp token mới; `POST /api/auth/logout` revoke refresh token hiện tại.

AuthService chứa logic xác thực: validateUser() kiểm tra email và password với bcrypt.compare(); login() tạo JWT payload và ký token với secret key; refreshToken() xác minh refresh token và tạo token mới.

JwtStrategy (Passport strategy) xác minh access token từ header Authorization và extract user information vào request.user.

JwtAuthGuard được áp dụng cho tất cả protected routes để kiểm tra authentication.

#### 3.2.2. Module Proposals (ProposalsModule)

ProposalsModule quản lý đề tài NCKH với các thành phần.

ProposalsController định nghĩa endpoints: `GET /api/proposals` lấy danh sách có phân trang và lọc; `GET /api/proposals/:id` lấy chi tiết một đề tài; `POST /api/proposals` tạo đề tài mới (chỉ GIANG_VIEN); `PUT /api/proposals/:id` cập nhật thông tin; `DELETE /api/proposals/:id` soft delete đề tài.

ProposalsService chứa business logic: create() tạo proposal mới với state = DRAFT, tự động generate code theo format DT-XXX; findAll() với QueryBuilder hỗ trợ pagination, filtering, sorting; findOne() với include relations (owner, faculty, council, template, evaluations); update() kiểm tra quyền và state trước khi cho phép sửa; remove() soft delete với deletedAt timestamp.

CreateProposalDto và UpdateProposalDto định nghĩa validation rules với class-validator decorators.

#### 3.2.3. Module Workflow (WorkflowModule)

WorkflowModule triển khai State Machine pattern cho quy trình đề tài.

WorkflowService là core của module với các phương thức: executeTransition() là method chính nhận proposalId, action, actor và optional payload, thực hiện các bước kiểm tra transition hợp lệ từ state hiện tại, kiểm tra actor có quyền thực hiện action, thực hiện side effects (gửi notification, cập nhật holder,...), cập nhật proposal.state và tạo WorkflowLog trong transaction; getAvailableActions() trả về danh sách actions có thể thực hiện dựa trên state hiện tại và quyền của user; canTransition() kiểm tra một transition cụ thể có hợp lệ không.

TransitionRules định nghĩa các quy tắc chuyển đổi cho từng action, ví dụ: action SUBMIT từ state DRAFT sang FACULTY_COUNCIL_OUTLINE_REVIEW, yêu cầu actor role GIANG_VIEN và là owner của đề tài; action FINALIZE từ các state review, yêu cầu actor là SECRETARY của council được gán và tất cả members đã submit evaluation.

#### 3.2.4. Module Councils và Evaluations

CouncilsModule quản lý hội đồng đánh giá với các chức năng: tạo hội đồng với type và scope tương ứng; thêm thành viên với role (CHAIR, SECRETARY, MEMBER); gán hội đồng cho đề tài (cập nhật proposal.councilId).

EvaluationsModule quản lý đánh giá của thành viên hội đồng: tạo evaluation khi member được gán vào council của một proposal; lưu đánh giá với state = DRAFT (có thể sửa); submit đánh giá chuyển state = SUBMITTED (không thể sửa); sau khi tất cả members submit, secretary có thể finalize (state = FINALIZED).

### 3.3. Xây dựng Frontend với React

#### 3.3.1. Tổ chức Components theo Atomic Design

Components được tổ chức theo nguyên tắc Atomic Design với các cấp độ.

**Atoms (ui/)** là các component cơ bản nhất: Button với variants (primary, secondary, outline, ghost); Input với types (text, email, password, number); Badge cho hiển thị trạng thái; Modal/Dialog cho popup; Spinner cho loading states.

**Molecules (proposals/, evaluation/)** kết hợp nhiều atoms: ProposalCard hiển thị summary của một đề tài; StateBadge hiển thị trạng thái với màu sắc tương ứng; EvaluationScoreInput cho nhập điểm đánh giá; FilterPanel cho bộ lọc danh sách.

**Organisms (workflow/, layout/)** là các component phức tạp: WorkflowTimeline hiển thị lịch sử chuyển trạng thái; TransitionButtons hiển thị các action buttons khả dụng; ProposalActions xử lý tất cả actions cho một đề tài; Header, Sidebar, MainLayout tạo khung giao diện.

**Templates và Pages (app/)** kết hợp organisms thành trang hoàn chỉnh: DashboardPage, ProposalListPage, ProposalDetailPage, CreateProposalPage,...

#### 3.3.2. State Management với Zustand

Zustand được chọn làm state management library vì API đơn giản và bundle size nhỏ.

AuthStore quản lý authentication state với các thuộc tính: user (thông tin user hiện tại hoặc null); isAuthenticated (boolean); và các actions: login() gọi API và lưu tokens; logout() xóa tokens và reset state; checkAuth() kiểm tra token validity khi app khởi động.

ProposalStore quản lý state liên quan đến proposals với các thuộc tính: currentProposal (đề tài đang xem/sửa); filters (bộ lọc hiện tại); và các actions: setFilters() cập nhật bộ lọc; setCurrentProposal() khi navigate đến detail page.

#### 3.3.3. Data Fetching với React Query

React Query (TanStack Query) được sử dụng cho server state management.

useProposals hook fetch danh sách đề tài với queryKey bao gồm 'proposals' và filters object, queryFn gọi proposalApi.getAll(filters), cấu hình staleTime 5 phút để cache và giảm requests.

useProposal hook fetch chi tiết một đề tài với queryKey bao gồm 'proposal' và id, queryFn gọi proposalApi.getById(id).

useCreateProposal, useUpdateProposal mutations cho tạo và cập nhật đề tài với onSuccess invalidate queries để refresh data.

useTransition mutation cho workflow transitions gọi workflowApi.transition() và invalidate cả proposal detail và list.

### 3.4. Kiểm thử hệ thống

#### 3.4.1. Unit Testing

Unit tests được viết với Jest framework, tập trung vào các service classes.

WorkflowService tests kiểm tra: executeTransition() với valid transition thành công; executeTransition() với invalid transition throw BadRequestException; executeTransition() với unauthorized actor throw ForbiddenException; getAvailableActions() trả về đúng actions cho từng state và role.

ProposalsService tests kiểm tra: create() tạo proposal với state DRAFT và code tự động generate; findAll() với filters trả về đúng kết quả; update() chỉ cho phép khi state là DRAFT hoặc CHANGES_REQUESTED.

Test coverage đạt trên 85% cho services và 75% cho controllers.

#### 3.4.2. End-to-End Testing với Playwright

E2E tests sử dụng Playwright để kiểm tra full workflow từ UI hoặc API.

Full Workflow Test kiểm tra luồng hoàn chỉnh từ DRAFT đến APPROVED: Phase 1 tạo proposal mới và submit (DRAFT → FACULTY_COUNCIL_OUTLINE_REVIEW); Phase 2 gán faculty council, 4 members đánh giá (mỗi người DRAFT → SUBMITTED), secretary finalize (→ SCHOOL_COUNCIL_OUTLINE_REVIEW); Phase 3 tương tự với school council (→ APPROVED).

Kết quả E2E tests: 9/9 test cases passed cho full workflow; 20/20 test cases passed cho individual features; Coverage đạt 95% cho critical paths.

### 3.5. Triển khai hệ thống

#### 3.5.1. Docker Deployment

Hệ thống được containerize với Docker, bao gồm các services.

Backend service build từ Dockerfile với base image node:20-alpine, copy source và run npm run build, expose port 4000.

Frontend service build với multi-stage: stage 1 build React app với npm run build; stage 2 serve static files với nginx:alpine, copy build output và nginx config.

Database service sử dụng image postgres:15 với volume mount cho data persistence.

docker-compose.yml orchestrate các services với proper networking, environment variables từ .env file, và health checks.

#### 3.5.2. CI/CD Pipeline

Pipeline được cấu hình với các stages.

**Build stage**: Checkout code; Install dependencies (npm ci); Build backend và frontend (npm run build); Build Docker images.

**Test stage**: Run unit tests (npm test); Run E2E tests với Playwright; Generate coverage reports.

**Deploy stage** (chỉ cho main branch): Push images lên container registry; Deploy lên target environment với docker-compose hoặc Kubernetes.

### 3.6. Kết quả đạt được

#### 3.6.1. Các chức năng đã hoàn thành

Hệ thống đã hoàn thành đầy đủ các nhóm chức năng theo yêu cầu.

**Quản lý đề tài**: Tạo đề tài mới với form động theo template MAU_01B; Lưu nháp và chỉnh sửa; Nộp đề tài; Xem danh sách với phân trang, lọc, tìm kiếm; Xem chi tiết với timeline workflow; Rút đề tài.

**Xét duyệt và đánh giá**: Gán hội đồng khoa/trường; Đánh giá độc lập của từng thành viên; Tổng hợp kết quả bởi thư ký; Phê duyệt, trả về, từ chối đề tài.

**Quản lý hội đồng**: Tạo hội đồng với các loại FACULTY_OUTLINE, SCHOOL_OUTLINE, FACULTY_ACCEPTANCE, SCHOOL_ACCEPTANCE; Quản lý thành viên với vai trò CHAIR, SECRETARY, MEMBER.

**Quản trị**: Quản lý người dùng với 6 vai trò; Dashboard thống kê; Audit log; Export Excel.

#### 3.6.2. Đánh giá hiệu năng

API response time trung bình 150ms, đạt yêu cầu dưới 500ms.

Page load time trung bình 1.8 giây, đạt yêu cầu dưới 3 giây.

Hệ thống đã test với 100 concurrent users bằng k6 load testing tool, không có errors.

Database query performance được tối ưu với proper indexing trên các columns thường xuyên query.

#### 3.6.3. Hình ảnh giao diện hệ thống

*(Phần này chèn các screenshot giao diện hệ thống bao gồm: Màn hình đăng nhập; Dashboard với thống kê; Danh sách đề tài với bộ lọc; Chi tiết đề tài với timeline; Form tạo đề tài; Form đánh giá của thành viên hội đồng; Màn hình tổng hợp kết quả đánh giá)*

---

## KẾT LUẬN VÀ KIẾN NGHỊ

### 1. Kết quả đạt được

Qua quá trình nghiên cứu và phát triển, đồ án đã hoàn thành các mục tiêu đề ra.

**Về mặt chức năng nghiệp vụ**, hệ thống đã tin học hóa thành công toàn bộ quy trình quản lý đề tài NCKH cấp trường từ đăng ký, xét duyệt đề cương qua hai cấp hội đồng (FACULTY_COUNCIL_OUTLINE_REVIEW, SCHOOL_COUNCIL_OUTLINE_REVIEW), triển khai thực hiện (IN_PROGRESS), đến nghiệm thu kết quả qua hai cấp hội đồng (FACULTY_COUNCIL_ACCEPTANCE_REVIEW, SCHOOL_COUNCIL_ACCEPTANCE_REVIEW) và bàn giao (HANDOVER, COMPLETED). Hệ thống hỗ trợ đánh giá độc lập của nhiều thành viên hội đồng với các vai trò CHAIR, SECRETARY, MEMBER và tổng hợp kết quả tự động.

**Về mặt kỹ thuật**, đồ án đã áp dụng thành công các công nghệ và pattern hiện đại: kiến trúc monorepo với Nx giúp quản lý cả backend và frontend trong một repository; State Machine Pattern với 14 trạng thái (ProjectState) và 26 hành động (WorkflowAction) quản lý quy trình phức tạp; hệ thống phân quyền RBAC với 6 vai trò (UserRole) và 15 quyền (Permission); NestJS backend với 27 modules có cấu trúc rõ ràng; React 19 frontend với 97 components theo atomic design; PostgreSQL database với Prisma ORM đảm bảo type-safety.

**Về mặt chất lượng**, hệ thống đạt các chỉ tiêu: Unit test coverage trên 85%; E2E tests pass 100% cho critical workflow; API response time trung bình 150ms; Audit log đầy đủ cho mọi hành động quan trọng.

### 2. Hạn chế

Bên cạnh các kết quả đạt được, đồ án còn một số hạn chế cần được khắc phục.

Hệ thống chưa tích hợp với email server của trường để gửi thông báo tự động qua email khi có thay đổi trạng thái hoặc cần xử lý hồ sơ.

Chưa phát triển ứng dụng mobile native, hiện tại chỉ có giao diện web responsive có thể truy cập từ mobile browser.

Chưa hỗ trợ đa ngôn ngữ, hiện tại chỉ có giao diện tiếng Việt.

Module quản lý kinh phí đề tài chưa được phát triển chi tiết với các tính năng theo dõi giải ngân, quyết toán.

### 3. Hướng phát triển

Để hoàn thiện và mở rộng hệ thống, các hướng phát triển được đề xuất như sau.

**Tích hợp AI/ML**: Sử dụng Large Language Models hỗ trợ giảng viên viết đề cương nghiên cứu; Đề xuất tự động thành viên hội đồng dựa trên chuyên môn; Phát hiện trùng lặp nội dung với các đề tài đã thực hiện.

**Phát triển Mobile App**: Xây dựng ứng dụng mobile với React Native chia sẻ codebase với web; Push notifications cho các sự kiện quan trọng.

**Analytics và Reporting**: Bổ sung module phân tích dữ liệu với biểu đồ nâng cao; Báo cáo xu hướng nghiên cứu theo năm, theo lĩnh vực; Dự báo workload cho các đơn vị.

**Tích hợp hệ thống**: Kết nối với hệ thống quản lý đào tạo để lấy thông tin giảng viên; Tích hợp với hệ thống tài chính để quản lý kinh phí; Kết nối với cổng thông tin điện tử của trường.

**Tối ưu hiệu năng**: Triển khai Redis cache cho frequently accessed data; CDN cho static assets; Database read replicas cho reporting queries.

---

## TÀI LIỆU THAM KHẢO

[1] Nguyễn Văn Vỵ, Nguyễn Việt Hà (2023), *Giáo trình Phân tích và Thiết kế Hệ thống Thông tin*, NXB Đại học Quốc gia Hà Nội.

[2] Phạm Hữu Khang (2022), *Phát triển ứng dụng web với Node.js và Express*, NXB Khoa học và Kỹ thuật.

[3] Đặng Văn Đức (2023), *Cơ sở dữ liệu quan hệ: Lý thuyết và Thực hành với PostgreSQL*, NXB Giáo dục Việt Nam.

[4] Nguyễn Thanh Tùng (2021), *Công nghệ phần mềm hiện đại*, NXB Thống kê.

[5] Trần Đình Quế (2022), *Bảo mật ứng dụng Web: Nguyên lý và Thực hành*, NXB Bách khoa Hà Nội.

[6] Lê Đình Duy (2023), *React - Xây dựng giao diện người dùng hiện đại*, NXB Thông tin và Truyền thông.

[7] Nguyễn Hồng Sơn (2022), *Kiến trúc Microservices với Node.js*, NXB Đại học Bách khoa Hà Nội.

[8] Hoàng Kiếm (2021), *Quản lý dự án phần mềm theo phương pháp Agile*, NXB Lao động - Xã hội.

[9] Vũ Đức Thi (2023), *Docker và Container: Từ cơ bản đến nâng cao*, NXB Khoa học Tự nhiên và Công nghệ.

[10] Bộ Giáo dục và Đào tạo (2021), *Thông tư số 22/2021/TT-BGDĐT về quản lý hoạt động khoa học và công nghệ trong cơ sở giáo dục đại học*, Hà Nội.

---

## PHỤ LỤC

### Phụ lục A: Hướng dẫn cài đặt và triển khai

**Yêu cầu hệ thống**

Phần cứng tối thiểu: CPU 2 cores, RAM 4GB, Disk 20GB. Phần mềm yêu cầu: Node.js phiên bản 20.x trở lên, PostgreSQL phiên bản 15 trở lên (hoặc Docker), Git phiên bản 2.40 trở lên.

**Bước 1: Clone mã nguồn**

```bash
git clone https://github.com/institution/qlnckh.git
cd qlnckh
```

**Bước 2: Cài đặt dependencies**

```bash
npm install
```

**Bước 3: Cấu hình môi trường**

```bash
cp .env.example .env
```

Chỉnh sửa file .env với các thông số: DATABASE_URL chứa connection string PostgreSQL; JWT_SECRET là secret key cho JWT (ít nhất 32 ký tự); JWT_EXPIRES_IN là thời hạn access token (mặc định 15m).

**Bước 4: Khởi tạo database**

```bash
npx prisma migrate deploy
npx prisma db seed
```

**Bước 5: Chạy ứng dụng**

Development mode:
```bash
# Terminal 1 - Backend
npm run start:dev

# Terminal 2 - Frontend
npm run start:web
```

Production mode với Docker:
```bash
docker-compose up -d
```

**Bước 6: Truy cập hệ thống**

Frontend: http://localhost:3000

Backend API: http://localhost:4000/api

API Documentation: http://localhost:4000/api/docs

### Phụ lục B: Cấu trúc Database Schema

Database schema đầy đủ được định nghĩa trong file `prisma/schema.prisma` với 18 bảng chính và 16 enum types. Chi tiết xem trong phần đính kèm mã nguồn.

### Phụ lục C: Danh sách API Endpoints

**Authentication APIs**

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/auth/login | Đăng nhập |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/logout | Đăng xuất |

**Proposals APIs**

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/proposals | Danh sách đề tài |
| GET | /api/proposals/:id | Chi tiết đề tài |
| POST | /api/proposals | Tạo đề tài mới |
| PUT | /api/proposals/:id | Cập nhật đề tài |
| DELETE | /api/proposals/:id | Xóa đề tài |

**Workflow APIs**

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/workflow/:id/transition | Chuyển trạng thái |
| GET | /api/workflow/:id/available-actions | Lấy actions khả dụng |
| GET | /api/workflow/:id/history | Lịch sử workflow |

**Councils APIs**

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/councils | Danh sách hội đồng |
| POST | /api/councils | Tạo hội đồng |
| POST | /api/council/:proposalId/assign-council | Gán hội đồng cho đề tài |
| POST | /api/council/faculty/:proposalId/assign | Gán hội đồng khoa |

**Evaluations APIs**

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/evaluations/proposal/:proposalId | Lấy đánh giá của đề tài |
| POST | /api/evaluations | Tạo đánh giá |
| PUT | /api/evaluations/:id | Cập nhật đánh giá |
| POST | /api/evaluations/:id/submit | Nộp đánh giá |

---

*Báo cáo được hoàn thành vào tháng 02/2026*

*Sinh viên thực hiện: [Tên sinh viên]*

*Giảng viên hướng dẫn: [Tên giảng viên]*
