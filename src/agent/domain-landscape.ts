import {
  DomainLandscapeInfo,
  LegalDomain,
  LegalDocumentMetadata,
  GuidedTopic,
} from './types.js';

/**
 * Cơ sở dữ liệu Siêu dữ liệu & Bản đồ Toàn cảnh (Domain Landscape)
 * của 5 bộ luật cốt lõi trong cơ sở dữ liệu CivicLaw AI:
 * 1. TRAFFIC: Nghị định 168/2024/NĐ-CP & Luật Trật tự ATGTĐB 36/2024/QH15
 * 2. LABOR: Bộ luật Lao động 2019 (45/2019/QH14)
 * 3. INSURANCE: Luật Bảo hiểm xã hội 2024 (41/2024/QH15)
 * 4. HOUSING: Luật Nhà ở 2023 (27/2023/QH15)
 * 5. CIVIL: Bộ luật Dân sự 2015 (91/2015/QH13)
 */
export const DOMAINS_LANDSCAPE_DATA: Record<LegalDomain, DomainLandscapeInfo> = {
  TRAFFIC: {
    domain: 'TRAFFIC',
    domainNameVi: 'Giao thông đường bộ',
    icon: '🚦',
    summary:
      'Hệ thống quy chuẩn an toàn giao thông đường bộ, chế tài xử phạt vi phạm hành chính và cơ chế trừ điểm Giấy phép lái xe (GPLX) mới nhất áp dụng từ năm 2025.',
    documents: [
      {
        docNumber: '168/2024/NĐ-CP',
        title: 'Nghị định 168/2024/NĐ-CP quy định xử phạt vi phạm hành chính về trật tự, an toàn giao thông đường bộ; trừ điểm, phục hồi điểm Giấy phép lái xe',
        officialRef: 'Nghị định số 168/2024/NĐ-CP của Chính phủ',
        effectiveDate: '2025-01-01',
        domain: 'TRAFFIC',
        keyTopics: ['Xử phạt hành chính', 'Trừ điểm GPLX', 'Tạm giữ phương tiện', 'Nồng độ cồn', 'Tốc độ'],
        scopeDescription: 'Quy định các hành vi vi phạm, hình thức, mức xử phạt, biện pháp khắc phục hậu quả và thủ tục trừ điểm, phục hồi điểm giấy phép lái xe.',
      },
      {
        docNumber: '36/2024/QH15',
        title: 'Luật Trật tự, an toàn giao thông đường bộ 2024',
        officialRef: 'Luật số 36/2024/QH15 của Quốc hội',
        effectiveDate: '2025-01-01',
        domain: 'TRAFFIC',
        keyTopics: ['Quy tắc giao thông', 'Điều kiện phương tiện', 'Chỉ huy điều khiển giao thông', 'Quyền và nghĩa vụ người tham gia'],
        scopeDescription: 'Quy tắc giao thông đường bộ, điều kiện phương tiện tham gia giao thông và quản lý nhà nước về trật tự an toàn giao thông.',
      },
    ],
    keyPillars: [
      {
        title: 'Cơ chế Trừ điểm & Phục hồi điểm GPLX (12 điểm/năm)',
        detail: 'Giấy phép lái xe có 12 điểm mỗi năm. Các hành vi vi phạm sẽ bị trừ từ 2 đến 12 điểm tùy mức độ nguy hiểm; nếu hết điểm phải kiểm tra lại kiến thức pháp luật.',
      },
      {
        title: 'Chế tài Xử phạt Quy tắc Giao thông Đô thị',
        detail: 'Quy định mức phạt nghiêm khắc đối với lỗi không chấp hành hiệu lệnh đèn tín hiệu giao thông (vượt đèn đỏ/vàng), đi ngược chiều, đi sai làn đường.',
      },
      {
        title: 'Kiểm soát Nồng độ cồn & Chất kích thích',
        detail: 'Tuyệt đối nghiêm cấm điều khiển phương tiện tham gia giao thông đường bộ mà trong máu hoặc hơi thở có nồng độ cồn; phân cấp 3 khung phạt tiền và tước quyền sử dụng GPLX.',
      },
      {
        title: 'Quy chuẩn Tốc độ & Thiết bị An toàn',
        detail: 'Khung xử phạt chạy quá tốc độ từ dưới 5km/h đến trên 35km/h đối với ô tô, mô tô, xe gắn máy; quy định thắt dây an toàn và ghế chuyên dụng cho trẻ em.',
      },
    ],
    guidedTopics: [
      {
        id: 'traffic-red-light',
        title: 'Mức phạt và trừ điểm GPLX lỗi vượt đèn đỏ xe máy / ô tô',
        sampleQuery: 'Vượt đèn đỏ xe máy phạt bao nhiêu?',
        description: 'Chi tiết mức tiền phạt và số điểm GPLX bị trừ khi không chấp hành hiệu lệnh đèn tín hiệu.',
      },
      {
        id: 'traffic-points-recovery',
        title: 'Quy chế trừ điểm Giấy phép lái xe và điều kiện phục hồi điểm',
        sampleQuery: 'Quy định trừ điểm bằng lái xe theo Nghị định 168',
        description: 'Nguyên tắc quản lý 12 điểm bằng lái và thủ tục phục hồi điểm sau 12 tháng.',
      },
      {
        id: 'traffic-alcohol-limit',
        title: 'Mức phạt nồng độ cồn khi điều khiển xe máy và ô tô',
        sampleQuery: 'Mức phạt nồng độ cồn đối với người điều khiển xe máy',
        description: 'Các khung phạt tiền và thời hạn tước GPLX tương ứng với nồng độ cồn đo được.',
      },
      {
        id: 'traffic-speeding',
        title: 'Mức xử phạt chạy quá tốc độ quy định',
        sampleQuery: 'Chạy quá tốc độ 15km/h phạt bao nhiêu tiền?',
        description: 'Khung phạt vi phạm tốc độ đối với xe cơ giới theo từng mức vượt quy định.',
      },
    ],
    citationScope: ['Nghị định 168/2024/NĐ-CP', 'Luật 36/2024/QH15'],
  },

  LABOR: {
    domain: 'LABOR',
    domainNameVi: 'Lao động & Việc làm',
    icon: '👷',
    summary:
      'Hệ thống tiêu chuẩn lao động, quyền và nghĩa vụ của người lao động và người sử dụng lao động, chế độ hợp đồng, tiền lương, kỷ luật và chấm dứt việc làm theo Bộ luật Lao động 2019.',
    documents: [
      {
        docNumber: '45/2019/QH14',
        title: 'Bộ luật Lao động 2019',
        officialRef: 'Bộ luật số 45/2019/QH14 của Quốc hội',
        effectiveDate: '2021-01-01',
        domain: 'LABOR',
        keyTopics: ['Hợp đồng lao động', 'Thử việc', 'Tiền lương & Làm thêm giờ', 'Thời giờ làm việc - nghỉ ngơi', 'Kỷ luật sa thải'],
        scopeDescription: 'Xác lập tiêu chuẩn lao động; quyền, nghĩa vụ, trách nhiệm của các bên trong quan hệ lao động có hưởng lương.',
      },
    ],
    keyPillars: [
      {
        title: 'Giao kết Hợp đồng lao động & Thử việc',
        detail: 'Chỉ còn 2 loại hợp đồng: xác định thời hạn (tối đa 36 tháng) và không xác định thời hạn. Thời gian thử việc tối đa từ 6 đến 180 ngày; lương thử việc ít nhất 85% lương chính thức.',
      },
      {
        title: 'Tiền lương & Chế độ Làm thêm giờ (OT)',
        detail: 'Đơn giá tiền lương làm thêm giờ: tối thiểu 150% vào ngày thường, 200% vào ngày nghỉ hàng tuần, 300% vào ngày nghỉ lễ, tết; phụ cấp thêm giờ làm việc ban đêm.',
      },
      {
        title: 'Quyền Đơn phương Chấm dứt Hợp đồng',
        detail: 'Người lao động có quyền đơn phương chấm dứt HĐLĐ không cần lý do chỉ cần báo trước đúng luật (30 ngày với HĐLĐ xác định thời hạn, 45 ngày với HĐLĐ không xác định thời hạn).',
      },
      {
        title: 'Kỷ luật Lao động & Chế độ Bảo vệ Thai sản',
        detail: 'Cấm sa thải hoặc đơn phương chấm dứt HĐLĐ với lao động nữ mang thai, nghỉ thai sản, hoặc nuôi con dưới 12 tháng tuổi; quy trình xử lý kỷ luật nghiêm ngặt.',
      },
    ],
    guidedTopics: [
      {
        id: 'labor-probation',
        title: 'Thời gian thử việc tối đa và mức lương thử việc hợp pháp',
        sampleQuery: 'Thời gian thử việc tối đa theo Bộ luật Lao động là bao lâu?',
        description: 'Quy định về thời hạn thử việc theo từng chức danh chuyên môn và mức lương thử việc tối thiểu.',
      },
      {
        id: 'labor-notice-period',
        title: 'Quyền nghỉ việc và thời hạn báo trước theo luật',
        sampleQuery: 'Nghỉ việc cần báo trước bao nhiêu ngày?',
        description: 'Thời hạn báo trước bắt buộc khi người lao động muốn đơn phương chấm dứt hợp đồng.',
      },
      {
        id: 'labor-overtime-pay',
        title: 'Cách tính tiền lương làm thêm giờ và làm việc vào ngày lễ',
        sampleQuery: 'Đi làm ngày lễ được hưởng bao nhiêu phần trăm lương?',
        description: 'Tỷ lệ hưởng lương làm thêm giờ ban ngày, ban đêm và các ngày lễ tết được nghỉ hưởng nguyên lương.',
      },
      {
        id: 'labor-unlawful-dismissal',
        title: 'Các trường hợp cấm người sử dụng lao động sa thải nhân viên',
        sampleQuery: 'Công ty sa thải nhân viên khi đang ốm đau có vi phạm luật không?',
        description: 'Những rào cản pháp lý bảo vệ người lao động khỏi bị chấm dứt hợp đồng trái pháp luật.',
      },
    ],
    citationScope: ['Bộ luật Lao động 2019 (Luật số 45/2019/QH14)'],
  },

  INSURANCE: {
    domain: 'INSURANCE',
    domainNameVi: 'Bảo hiểm xã hội',
    icon: '🏥',
    summary:
      'Chế độ an sinh xã hội toàn dân: điều kiện rút BHXH một lần, chế độ thai sản, ốm đau, tai nạn lao động, lương hưu và quyền lợi của người tham gia.',
    documents: [
      {
        docNumber: '41/2024/QH15',
        title: 'Luật Bảo hiểm xã hội 2024',
        officialRef: 'Luật số 41/2024/QH15 của Quốc hội',
        effectiveDate: '2025-07-01',
        domain: 'INSURANCE',
        keyTopics: ['BHXH bắt buộc & tự nguyện', 'Rút BHXH 1 lần', 'Chế độ thai sản', 'Chế độ hưu trí', 'Ốm đau & Tử tuất'],
        scopeDescription: 'Chế độ, chính sách bảo hiểm xã hội; quyền và trách nhiệm của người lao động, người sử dụng lao động và cơ quan bảo hiểm.',
      },
    ],
    keyPillars: [
      {
        title: 'Điều kiện & Mức hưởng Rút BHXH Một Lần',
        detail: 'Quy định các trường hợp được hưởng BHXH 1 lần (ra nước ngoài định cư, mắc bệnh hiểm nghèo, hoặc sau 12 tháng nghỉ việc không tiếp tục tham gia); cách tính số tiền nhận.',
      },
      {
        title: 'Chế độ Thai sản Toàn diện',
        detail: 'Lao động nữ được nghỉ 6 tháng hưởng 100% tiền lương bình quân đóng BHXH kèm trợ cấp một lần; lao động nam có vợ sinh con được nghỉ từ 5 đến 14 ngày làm việc.',
      },
      {
        title: 'Lộ trình Nghỉ hưu & Tỷ lệ Hưởng Lương hưu',
        detail: 'Điều kiện số năm đóng BHXH tối thiểu để nhận lương hưu hàng tháng; công thức tính tỷ lệ phần trăm mức hưởng lương hưu tối đa lên tới 75%.',
      },
      {
        title: 'Chế độ Ốm đau & Tai nạn Lao động',
        detail: 'Thời gian tối đa nghỉ hưởng trợ cấp ốm đau trong năm; mức hưởng bằng 75% mức tiền lương đóng BHXH của tháng liền kề trước khi nghỉ việc.',
      },
    ],
    guidedTopics: [
      {
        id: 'insurance-lump-sum',
        title: 'Điều kiện và hồ sơ giải quyết rút Bảo hiểm xã hội một lần',
        sampleQuery: 'Điều kiện rút bảo hiểm xã hội một lần mới nhất',
        description: 'Chi tiết các trường hợp đủ điều kiện rút BHXH 1 lần và cách tính tiền hưởng.',
      },
      {
        id: 'insurance-maternity-men',
        title: 'Quyền lợi chế độ thai sản của người chồng khi vợ sinh con',
        sampleQuery: 'Vợ sinh con thì chồng được nghỉ mấy ngày BHXH?',
        description: 'Số ngày nghỉ việc hưởng trợ cấp BHXH dành cho lao động nam khi vợ sinh thường hoặc sinh mổ.',
      },
      {
        id: 'insurance-pension-age',
        title: 'Tuổi nghỉ hưu và số năm đóng BHXH tối thiểu để nhận lương hưu',
        sampleQuery: 'Bao nhiêu tuổi thì được nhận lương hưu?',
        description: 'Lộ trình tăng tuổi nghỉ hưu của nam/nữ và điều kiện hưởng lương hưu hàng tháng.',
      },
      {
        id: 'insurance-sickness-benefit',
        title: 'Mức tiền trợ cấp nghỉ ốm đau và thời gian hưởng tối đa',
        sampleQuery: 'Nghỉ ốm đau được hưởng bao nhiêu phần trăm lương BHXH?',
        description: 'Chính sách chi trả tiền trợ cấp ốm đau ngắn ngày và dài ngày từ quỹ BHXH.',
      },
    ],
    citationScope: ['Luật Bảo hiểm xã hội 2024 (Luật số 41/2024/QH15)'],
  },

  HOUSING: {
    domain: 'HOUSING',
    domainNameVi: 'Nhà ở & Chung cư',
    icon: '🏠',
    summary:
      'Quy chế phát triển, quản lý, sử dụng nhà ở; điều kiện mua bán/thuê nhà ở xã hội; cơ chế quản lý vận hành tòa nhà chung cư và quỹ bảo trì 2% theo Luật Nhà ở 2023.',
    documents: [
      {
        docNumber: '27/2023/QH15',
        title: 'Luật Nhà ở 2023',
        officialRef: 'Luật số 27/2023/QH15 của Quốc hội',
        effectiveDate: '2024-08-01',
        domain: 'HOUSING',
        keyTopics: ['Sở hữu nhà ở', 'Nhà ở xã hội', 'Nhà chung cư & Quỹ bảo trì', 'Hợp đồng mua bán thuê nhà', 'Cải tạo chung cư cũ'],
        scopeDescription: 'Sở hữu, phát triển, quản lý vận hành, giao dịch về nhà ở và quản lý nhà nước về nhà ở tại Việt Nam.',
      },
    ],
    keyPillars: [
      {
        title: 'Chính sách Phát triển & Hưởng thụ Nhà ở Xã hội',
        detail: 'Điều kiện đối tượng, thu nhập và điều kiện nhà ở để được mua, thuê mua nhà ở xã hội; chính sách miễn giảm tiền sử dụng đất và hỗ trợ lãi suất vay mua nhà.',
      },
      {
        title: 'Quản lý Vận hành Chung cư & Quỹ Bảo trì 2%',
        detail: 'Quy định rõ ràng về sở hữu chung - riêng trong chung cư; trách nhiệm bàn giao quỹ bảo trì 2% cho Ban quản trị và cơ chế cưỡng chế khi chủ đầu tư chây ì.',
      },
      {
        title: 'Hợp đồng Cho thuê & Mua bán Nhà ở',
        detail: 'Các điều khoản bắt buộc trong hợp đồng; quyền đơn phương chấm dứt hợp đồng khi bên kia vi phạm thanh toán hoặc tự ý cải tạo kết cấu căn nhà.',
      },
      {
        title: 'Thời hạn Sở hữu & Quyền của Người nước ngoài',
        detail: 'Không áp dụng niên hạn sở hữu chung cư vĩnh viễn theo thời hạn đất mà theo thời hạn công trình; điều kiện người Việt định cư nước ngoài mua nhà như công dân trong nước.',
      },
    ],
    guidedTopics: [
      {
        id: 'housing-social-qualification',
        title: 'Điều kiện và đối tượng được đăng ký mua nhà ở xã hội',
        sampleQuery: 'Đối tượng nào được mua nhà ở xã hội theo Luật Nhà ở 2023?',
        description: 'Tiêu chuẩn về thu nhập, tình trạng nhà ở và hồ sơ xin cấp suất mua nhà ở xã hội.',
      },
      {
        id: 'housing-maintenance-fund',
        title: 'Quy định quản lý, bàn giao và sử dụng quỹ bảo trì 2% chung cư',
        sampleQuery: 'Quỹ bảo trì 2% chung cư do ai quản lý?',
        description: 'Quyền hạn của Ban quản trị chung cư và trách nhiệm của chủ đầu tư đối với tiền quỹ bảo trì.',
      },
      {
        id: 'housing-lease-cancellation',
        title: 'Quyền đơn phương chấm dứt hợp đồng thuê nhà ở',
        sampleQuery: 'Chủ nhà có được tự ý đuổi người thuê nhà không?',
        description: 'Căn cứ pháp lý và thời hạn báo trước khi hủy bỏ hợp đồng thuê nhà ở.',
      },
      {
        id: 'housing-certificate',
        title: 'Điều kiện cấp Giấy chứng nhận quyền sở hữu nhà ở (Sổ hồng)',
        sampleQuery: 'Điều kiện để được công nhận quyền sở hữu nhà ở',
        description: 'Trình tự công nhận quyền sở hữu đối với nhà ở thương mại, nhà riêng lẻ và căn hộ chung cư.',
      },
    ],
    citationScope: ['Luật Nhà ở 2023 (Luật số 27/2023/QH15)'],
  },

  CIVIL: {
    domain: 'CIVIL',
    domainNameVi: 'Hợp đồng & Dân sự',
    icon: '⚖️',
    summary:
      'Địa vị pháp lý, chuẩn mực pháp lý về quyền và nghĩa vụ dân sự của cá nhân, pháp nhân; chế định giao dịch, hợp đồng dân sự, biện pháp bảo đảm và bồi thường thiệt hại.',
    documents: [
      {
        docNumber: '91/2015/QH13',
        title: 'Bộ luật Dân sự 2015',
        officialRef: 'Bộ luật số 91/2015/QH13 của Quốc hội',
        effectiveDate: '2017-01-01',
        domain: 'CIVIL',
        keyTopics: ['Giao dịch dân sự', 'Hợp đồng & Đặt cọc', 'Lãi suất vay', 'Biện pháp bảo đảm', 'Bồi thường thiệt hại ngoài hợp đồng'],
        scopeDescription: 'Xác lập địa vị pháp lý, chuẩn mực pháp lý về ứng xử của cá nhân, pháp nhân; quyền, nghĩa vụ về nhân thân và tài sản trong quan hệ dân sự.',
      },
    ],
    keyPillars: [
      {
        title: 'Hợp đồng Dân sự & Biện pháp Đặt cọc',
        detail: 'Quy định về giao kết và thực hiện hợp đồng; xử lý tài sản đặt cọc: nếu bên đặt cọc từ chối thì mất cọc, nếu bên nhận cọc từ chối thì phải trả lại tiền cọc và phạt cọc tương đương.',
      },
      {
        title: 'Trần Lãi suất Cho vay Dân sự (Tối đa 20%/năm)',
        detail: 'Lãi suất vay do các bên thỏa thuận nhưng không được vượt quá 20%/năm của khoản tiền vay; phần lãi suất vượt quá mức quy định sẽ không có hiệu lực thi hành.',
      },
      {
        title: 'Hiệu lực của Hợp đồng & Trường hợp Vô hiệu',
        detail: 'Hợp đồng vô hiệu do giả tạo, nhầm lẫn, lừa dối, đe dọa, cưỡng ép hoặc vi phạm điều cấm của luật; hậu quả pháp lý của giao dịch dân sự vô hiệu.',
      },
      {
        title: 'Trách nhiệm Bồi thường Thiệt hại Ngoài Hợp đồng',
        detail: 'Căn cứ phát sinh trách nhiệm bồi thường: có hành vi trái luật, có thiệt hại thực tế xảy ra và có mối quan hệ nhân quả; nguyên tắc bồi thường toàn bộ và kịp thời.',
      },
    ],
    guidedTopics: [
      {
        id: 'civil-deposit-rules',
        title: 'Quy định pháp lý về đặt cọc và mức phạt cọc khi hủy hợp đồng',
        sampleQuery: 'Bên nhận đặt cọc từ chối bán thì phải đền bao nhiêu tiền?',
        description: 'Quy định Điều 328 Bộ luật Dân sự về xử lý tài sản đặt cọc khi một bên vi phạm cam kết.',
      },
      {
        id: 'civil-interest-cap',
        title: 'Mức trần lãi suất cho vay dân sự theo Bộ luật Dân sự 2015',
        sampleQuery: 'Lãi suất cho vay dân sự tối đa là bao nhiêu phần trăm?',
        description: 'Quy định trần lãi suất tối đa 20%/năm và hậu quả của việc cho vay vượt quá trần lãi suất.',
      },
      {
        id: 'civil-contract-validity',
        title: 'Các trường hợp hợp đồng dân sự bị tuyên bố vô hiệu',
        sampleQuery: 'Hợp đồng bị lừa dối có hiệu lực không?',
        description: 'Căn cứ pháp lý để yêu cầu Tòa án tuyên bố hợp đồng vô hiệu và giải quyết hậu quả hoàn trả.',
      },
      {
        id: 'civil-tort-damages',
        title: 'Nguyên tắc và căn cứ bồi thường thiệt hại ngoài hợp đồng',
        sampleQuery: 'Khi nào phải bồi thường thiệt hại ngoài hợp đồng?',
        description: 'Căn cứ phát sinh trách nhiệm bồi thường thiệt hại về tài sản, sức khỏe, tính mạng.',
      },
    ],
    citationScope: ['Bộ luật Dân sự 2015 (Bộ luật số 91/2015/QH13)'],
  },
};

/**
 * Hàm chuẩn hóa chuỗi để nhận diện linh hoạt không phân biệt dấu và khoảng trắng
 */
function normalizeDomainKey(str: string): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Trả về thông tin toàn cảnh của một lĩnh vực
 */
export function getDomainLandscape(domain: LegalDomain | string): DomainLandscapeInfo | null {
  const norm = normalizeDomainKey(domain);

  if (
    norm.includes('traffic') ||
    norm.includes('giaothong') ||
    norm === 'gt'
  ) {
    return DOMAINS_LANDSCAPE_DATA.TRAFFIC;
  }
  if (
    norm.includes('labor') ||
    norm.includes('laodong') ||
    norm.includes('vieclam')
  ) {
    return DOMAINS_LANDSCAPE_DATA.LABOR;
  }
  if (
    norm.includes('insurance') ||
    norm.includes('socialinsurance') ||
    norm.includes('bhxh') ||
    norm.includes('baohiem')
  ) {
    return DOMAINS_LANDSCAPE_DATA.INSURANCE;
  }
  if (
    norm.includes('housing') ||
    norm.includes('nhao') ||
    norm.includes('chungcu')
  ) {
    return DOMAINS_LANDSCAPE_DATA.HOUSING;
  }
  if (
    norm.includes('civil') ||
    norm.includes('dansu') ||
    norm.includes('hopdong')
  ) {
    return DOMAINS_LANDSCAPE_DATA.CIVIL;
  }

  return null;
}

/**
 * Lấy toàn bộ bản đồ 5 lĩnh vực
 */
export function getAllDomainLandscapes(): Record<LegalDomain, DomainLandscapeInfo> {
  return DOMAINS_LANDSCAPE_DATA;
}

/**
 * Từ khóa nhận diện câu hỏi mang tính chất TỔNG QUAN / ĐỊNH HƯỚNG (Exploratory Domain Inquiry)
 */
const EXPLORATORY_PREFIXES = [
  /^(cho\s+tôi|cho\s+mình|tôi\s+muốn\s+biết|hướng\s+dẫn|tìm\s+hiểu|giới\s+thiệu|tổng\s+quan|quy\s+định|pháp\s+luật|tra\s+cứu|thông\s+tin)(\s+(về|về\s+luật|về\s+lĩnh\s+vực|về\s+nghị\s+định))?\s+/i,
  /^(các\s+quy\s+định\s+về|những\s+điều\s+cần\s+biết\s+về|tìm\s+hiểu\s+về|tổng\s+quan\s+về)\s+/i,
];

/**
 * Cụm từ hỏi vi phạm hoặc tình huống cụ thể (Specific query markers)
 * Nếu câu hỏi chứa các từ này thì đây là câu hỏi tra cứu cụ thể, KHÔNG phải câu hỏi broad.
 */
const SPECIFIC_QUERY_MARKERS = [
  /(phạt\s+bao\s+nhiêu|mức\s+phạt|bao\s+nhiêu\s+tiền|tội\s+gì|bị\s+phạt)/i,
  /(bị\s+trừ\s+\d+\s+điểm|vượt\s+đèn\s+đỏ|nồng\s+độ\s+cồn|chạy\s+quá\s+tốc\s+độ)/i,
  /(ngược\s+chiều|quên\s+xi\s+nhan|thử\s+việc\s+tối\s+đa|báo\s+trước\s+bao\s+nhiêu\s+ngày)/i,
  /(được\s+nghỉ\s+mấy\s+ngày|bao\s+nhiêu\s+tuổi\s+thì\s+được\s+nhận\s+lương\s+hưu)/i,
  /(quỹ\s+bảo\s+trì\s+2%\s+do\s+ai\s+quản\s+lý|đền\s+bao\s+nhiêu\s+tiền|lãi\s+suất.*tối\s+đa|hợp\s+đồng\s+vô\s+hiệu)/i,
];

/**
 * Từ khóa nhận diện ngoài phạm vi cơ sở dữ liệu (Out of DB Scope)
 */
const OUT_OF_SCOPE_DOMAINS: { pattern: RegExp; nameVi: string }[] = [
  { pattern: /(hình\s+sự|giết\s+người|cướp\s+giật|trộm\s+cắp|ma\s+túy|tham\s+nhũng|tù\s+chung\s+thân|tử\s+hình)/i, nameVi: 'Hình sự (Bộ luật Hình sự)' },
  { pattern: /(thuế\s+gtgt|thuế\s+tncn|thuế\s+tndn|thuế\s+thu\s+nhập|kê\s+khai\s+thuế|hoàn\s+thuế|quyết\s+toán\s+thuế|nộp\s+thuế|tiền\s+thuế)/i, nameVi: 'Thuế & Quản lý thuế' },
  { pattern: /(hải\s+quan|thông\s+quan|xuất\s+nhập\s+khẩu|thuế\s+xuất\s+khẩu)/i, nameVi: 'Hải quan & Xuất nhập khẩu' },
  { pattern: /(sở\s+hữu\s+trí\s+tuệ|bản\s+quyền|sáng\s+chế|nhãn\s+hiệu|kiểu\s+dáng\s+công\s+nghiệp)/i, nameVi: 'Sở hữu trí tuệ' },
  { pattern: /(tranh\s+chấp\s+đất\s+đai|sổ\s+đỏ\s+đất\s+nông\s+nghiệp|thu\s+hồi\s+đất|giải\s+phóng\s+mặt\s+bằng|chuyển\s+mục\s+đích\s+sử\s+dụng\s+đất)/i, nameVi: 'Đất đai (Luật Đất đai)' },
];

/**
 * Kiểm tra xem câu hỏi có thuộc lĩnh vực ngoài cơ sở dữ liệu 5 bộ luật hay không
 */
export function isOutOfScopeDomain(query: string): { isOutOfScope: boolean; detectedTopic?: string } {
  const trimmed = (query || '').trim();
  for (const item of OUT_OF_SCOPE_DOMAINS) {
    if (item.pattern.test(trimmed)) {
      return { isOutOfScope: true, detectedTopic: item.nameVi };
    }
  }
  return { isOutOfScope: false };
}

/**
 * Nhận diện câu hỏi tổng quan khám phá lĩnh vực (Exploratory Domain Detection)
 */
export function detectExploratoryDomain(query: string): {
  domain: LegalDomain;
  isExploratory: boolean;
  confidence: number;
} | null {
  const trimmed = (query || '').trim();
  if (!trimmed) return null;

  // 1. Nếu câu hỏi có dấu hiệu hỏi vi phạm / tình huống chi tiết thì KHÔNG phải câu hỏi khám phá broad
  for (const marker of SPECIFIC_QUERY_MARKERS) {
    if (marker.test(trimmed)) {
      return null;
    }
  }

  // 2. Kiểm tra mẫu câu hỏi broad đối với từng lĩnh vực
  const trafficPatterns = [
    /^(cho\s+tôi\s+(về|biết\s+về)?\s+)?giao\s+thông(\s+đường\s+bộ)?$/i,
    /^(tổng\s+quan|tìm\s+hiểu|giới\s+thiệu|quy\s+định|pháp\s+luật)\s+(về\s+)?(luật\s+)?giao\s+thông(\s+đường\s+bộ)?$/i,
    /^quy\s+định\s+về\s+giao\s+thông(\s+đường\s+bộ)?$/i,
    /^luật\s+giao\s+thông(\s+đường\s+bộ)?$/i,
    /^nghị\s+định\s+168(\/2024)?(\/nđ-cp)?$/i,
    /^luật\s+36(\/2024)?(\/qh15)?$/i,
  ];

  const laborPatterns = [
    /^(cho\s+tôi\s+(về|biết\s+về)?\s+)?lao\s+động(\s+và\s+việc\s+làm)?$/i,
    /^(tổng\s+quan|tìm\s+hiểu|giới\s+thiệu|quy\s+định|pháp\s+luật)\s+(về\s+)?(bộ\s+luật\s+|luật\s+)?lao\s+động(\s+2019)?$/i,
    /^quy\s+định\s+về\s+lao\s+động(\s+và\s+việc\s+làm)?$/i,
    /^bộ\s+luật\s+lao\s+động(\s+2019)?$/i,
    /^luật\s+lao\s+động$/i,
  ];

  const insurancePatterns = [
    /^(cho\s+tôi\s+(về|biết\s+về)?\s+)?bảo\s+hiểm\s+xã\s+hội(\s+bhxh)?$/i,
    /^(tổng\s+quan|tìm\s+hiểu|giới\s+thiệu|quy\s+định|pháp\s+luật)\s+(về\s+)?(luật\s+)?bảo\s+hiểm\s+xã\s+hội(\s+2024)?$/i,
    /^quy\s+định\s+về\s+bảo\s+hiểm\s+xã\s+hội$/i,
    /^(luật\s+)?bhxh(\s+2024)?$/i,
    /^luật\s+bảo\s+hiểm\s+xã\s+hội$/i,
  ];

  const housingPatterns = [
    /^(cho\s+tôi\s+(về|biết\s+về)?\s+)?nhà\s+ở(\s+và\s+chung\s+cư)?$/i,
    /^(tổng\s+quan|tìm\s+hiểu|giới\s+thiệu|quy\s+định|pháp\s+luật)\s+(về\s+)?(luật\s+)?nhà\s+ở(\s+2023)?$/i,
    /^quy\s+định\s+về\s+nhà\s+ở(\s+và\s+chung\s+cư)?$/i,
    /^luật\s+nhà\s+ở(\s+2023)?$/i,
    /^quản\s+lý\s+nhà\s+chung\s+cư$/i,
  ];

  const civilPatterns = [
    /^(cho\s+tôi\s+(về|biết\s+về)?\s+)?(bộ\s+luật\s+)?dân\s+sự(\s+2015)?$/i,
    /^(tổng\s+quan|tìm\s+hiểu|giới\s+thiệu|quy\s+định|pháp\s+luật)\s+(về\s+)?(bộ\s+luật\s+|luật\s+)?dân\s+sự(\s+2015)?$/i,
    /^quy\s+định\s+về\s+(bộ\s+luật\s+)?dân\s+sự$/i,
    /^hợp\s+đồng\s+dân\s+sự$/i,
    /^bộ\s+luật\s+dân\s+sự(\s+2015)?$/i,
  ];

  for (const pattern of trafficPatterns) {
    if (pattern.test(trimmed)) {
      return { domain: 'TRAFFIC', isExploratory: true, confidence: 0.98 };
    }
  }

  for (const pattern of laborPatterns) {
    if (pattern.test(trimmed)) {
      return { domain: 'LABOR', isExploratory: true, confidence: 0.98 };
    }
  }

  for (const pattern of insurancePatterns) {
    if (pattern.test(trimmed)) {
      return { domain: 'INSURANCE', isExploratory: true, confidence: 0.98 };
    }
  }

  for (const pattern of housingPatterns) {
    if (pattern.test(trimmed)) {
      return { domain: 'HOUSING', isExploratory: true, confidence: 0.98 };
    }
  }

  for (const pattern of civilPatterns) {
    if (pattern.test(trimmed)) {
      return { domain: 'CIVIL', isExploratory: true, confidence: 0.98 };
    }
  }

  // 3. Kiểm tra bằng cách kết hợp tiền tố exploratory + tên lĩnh vực
  for (const prefix of EXPLORATORY_PREFIXES) {
    if (prefix.test(trimmed)) {
      const stripped = trimmed.replace(prefix, '').trim().toLowerCase();
      if (stripped.includes('giao thông') || stripped.includes('đường bộ') || stripped.includes('xe máy') || stripped.includes('ô tô')) {
        return { domain: 'TRAFFIC', isExploratory: true, confidence: 0.92 };
      }
      if (stripped.includes('lao động') || stripped.includes('việc làm') || stripped.includes('người lao động')) {
        return { domain: 'LABOR', isExploratory: true, confidence: 0.92 };
      }
      if (stripped.includes('bảo hiểm xã hội') || stripped.includes('bhxh') || stripped.includes('bảo hiểm')) {
        return { domain: 'INSURANCE', isExploratory: true, confidence: 0.92 };
      }
      if (stripped.includes('nhà ở') || stripped.includes('chung cư') || stripped.includes('thuê nhà')) {
        return { domain: 'HOUSING', isExploratory: true, confidence: 0.92 };
      }
      if (stripped.includes('dân sự') || stripped.includes('hợp đồng dân sự')) {
        return { domain: 'CIVIL', isExploratory: true, confidence: 0.92 };
      }
    }
  }

  return null;
}

/**
 * Định dạng bản tổng hợp Bản đồ Lĩnh vực (Domain Landscape Synthesis Markdown)
 * Cung cấp câu trả lời giàu thông tin, có cấu trúc rõ ràng và các gợi ý tương tác
 */
export function formatLandscapeSynthesis(landscape: DomainLandscapeInfo): string {
  const docSection = landscape.documents
    .map(
      (doc) =>
        `- 📜 **${doc.title}**\n  *Căn cứ chính thức:* \`${doc.officialRef}\` | *Hiệu lực:* ${doc.effectiveDate}\n  *Chuyên đề:* ${doc.keyTopics.join(', ')}`
    )
    .join('\n\n');

  const pillarSection = landscape.keyPillars
    .map((p, idx) => `**${idx + 1}. ${p.title}:**\n${p.detail}`)
    .join('\n\n');

  const topicsSection = landscape.guidedTopics
    .map((t) => `- 🔍 **${t.title}**\n  👉 *Hỏi ngay mẫu:* \`${t.sampleQuery}\``)
    .join('\n\n');

  return `### ${landscape.icon} Bản Đồ Quy Định Pháp Luật: ${landscape.domainNameVi}

${landscape.summary}

---

#### 📚 Văn Bản Pháp Quy Chính Thống Đang Áp Dụng
${docSection}

---

#### 🧭 4 Trọng Tâm Quy Định Cốt Lõi
${pillarSection}

---

#### 💡 Gợi Ý Chủ Đề Tra Cứu Nhanh (Click hoặc Gửi câu hỏi)
${topicsSection}

---
> ⚖️ *Nguồn tra cứu: 100% dữ liệu được kiểm chứng từ cơ sở dữ liệu pháp luật chính thống của CivicLaw AI (${landscape.citationScope.join(' & ')}).*`;
}

/**
 * Định dạng phản hồi Honest Fallback khi câu hỏi nằm ngoài cơ sở dữ liệu
 */
export function formatHonestFallback(query: string, detectedOutOfScopeDomain?: string): string {
  const topicMention = detectedOutOfScopeDomain ? ` (${detectedOutOfScopeDomain})` : '';

  return `⚠️ **Thông Báo Phạm Vi Cơ Sở Dữ Liệu Tra Cứu:**

CivicLaw AI hiện tại tập trung vận hành chuyên sâu và cam kết **100% trích dẫn chính thống** cho **5 lĩnh vực pháp luật cốt lõi**:
1. 🚦 **Giao thông đường bộ:** Nghị định 168/2024/NĐ-CP & Luật TTATGTĐB 2024 (Luật số 36/2024/QH15).
2. 👷 **Lao động & Việc làm:** Bộ luật Lao động 2019 (Luật số 45/2019/QH14).
3. 🏥 **Bảo hiểm xã hội:** Luật Bảo hiểm xã hội 2024 (Luật số 41/2024/QH15).
4. 🏠 **Nhà ở & Chung cư:** Luật Nhà ở 2023 (Luật số 27/2023/QH15).
5. ⚖️ **Hợp đồng & Dân sự:** Bộ luật Dân sự 2015 (Bộ luật số 91/2015/QH13).

Câu hỏi của Bạn liên quan đến chủ đề **nằm ngoài phạm vi 5 bộ luật trên**${topicMention}. 
Để đảm bảo tính chuẩn xác pháp lý và bảo vệ quyền lợi tối cao của công dân, CivicLaw AI từ chối đưa ra suy đoán không có căn cứ điều luật trong cơ sở dữ liệu.

📌 **Khuyến nghị hỗ trợ:**
- Vui lòng tra cứu trên Cổng thông tin điện tử Chính phủ: [vanban.chinhphu.vn](https://vanban.chinhphu.vn).
- Hoặc liên hệ cơ quan tư pháp / luật sư có thẩm quyền để được hỗ trợ chuyên sâu.`;
}
