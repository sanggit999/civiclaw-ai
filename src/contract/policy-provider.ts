import { SupabaseClient } from '@supabase/supabase-js';
import { ContractCategory } from './types.js';
import {
  ContractPolicy,
  IContractPolicyProvider,
  MandatoryClauseRule,
  ProhibitionRule,
  StatutoryLimitRule,
} from './policy-types.js';

export const DEFAULT_LABOR_POLICY: ContractPolicy = {
  category: 'labor',
  title: 'Chính sách Hợp đồng Lao động theo Bộ luật Lao động 2019',
  limits: [
    {
      metric: 'probation_days',
      threshold: 60,
      unit: 'days',
      statutoryCitation: 'Khoản 2 Điều 25 Bộ luật Lao động 2019',
      reasonTemplate:
        'Thời gian thử việc phát hiện ({value} ngày) vượt quá mức tối đa không quá {threshold} ngày theo quy định tại {citation}.',
      suggestedWordingTemplate:
        'Đề nghị sửa đổi thời gian thử việc thành tối đa không quá {threshold} ngày theo quy định tại {citation}.',
    },
    {
      metric: 'advance_notice_penalty',
      threshold: 0,
      unit: 'days',
      statutoryCitation: 'Điều 35 và Điều 40 Bộ luật Lao động 2019',
      reasonTemplate:
        'Người lao động có quyền đơn phương chấm dứt hợp đồng lao động chỉ cần báo trước theo thời hạn luật định (Điều 35 BLLĐ 2019). Việc áp đặt mức phạt tiền lương cố định khi người lao động nghỉ việc là trái pháp luật trừ khi vi phạm nghĩa vụ báo trước.',
      suggestedWordingTemplate:
        'Kính đề nghị sửa đổi: Người lao động có quyền đơn phương chấm dứt hợp đồng lao động khi báo trước 30 ngày theo quy định tại Điều 35 Bộ luật Lao động 2019 mà không phải bồi thường tiền lương.',
    },
  ],
  prohibitions: [
    {
      id: 'retaining_original_diplomas',
      name: 'Giữ bản chính văn bằng, chứng chỉ, giấy tờ tùy thân',
      keywords: ['bản chính', 'bằng gốc', 'giấy tờ gốc', 'văn bằng gốc'],
      secondaryKeywords: ['giữ', 'nộp', 'lưu giữ'],
      negativeKeywords: ['tự lưu giữ', 'không giữ', 'chỉ nộp bản sao', 'chỉ thu bản sao', 'chỉ giữ bản sao'],
      statutoryCitation: 'Khoản 1 Điều 17 Bộ luật Lao động 2019',
      reasonTemplate:
        'Khoản 1 Điều 17 Bộ luật Lao động 2019 nghiêm cấm người sử dụng lao động giữ bản chính giấy tờ tùy thân, văn bằng, chứng chỉ của người lao động. Điều khoản này bị coi là vô hiệu theo Điều 49 BLLĐ 2019.',
      suggestedWordingTemplate:
        'Kính đề nghị Công ty sửa đổi: Người lao động chỉ nộp bản sao công chứng để đối chiếu hồ sơ, bản chính do người lao động tự lưu giữ theo đúng quy định tại Khoản 1 Điều 17 Bộ luật Lao động 2019.',
      riskLevel: 'RED_ILLEGAL',
    },
    {
      id: 'fines_replacing_discipline',
      name: 'Phạt tiền, trừ lương thay việc xử lý kỷ luật lao động',
      keywords: ['phạt tiền', 'trừ lương', 'cắt lương', 'trực tiếp vào lương'],
      secondaryKeywords: ['kpi', 'đi muộn', 'vi phạm', 'nội quy'],
      statutoryCitation: 'Khoản 2 Điều 127 Bộ luật Lao động 2019',
      reasonTemplate:
        'Khoản 2 Điều 127 Bộ luật Lao động 2019 nghiêm cấm dùng hình thức phạt tiền, cắt lương thay việc xử lý kỷ luật lao động.',
      suggestedWordingTemplate:
        'Đề nghị bãi bỏ hình thức phạt tiền/cắt lương, áp dụng các biện pháp xử lý kỷ luật lao động theo đúng trình tự tại Điều 124 Bộ luật Lao động 2019.',
      riskLevel: 'RED_ILLEGAL',
    },
    {
      id: 'uncompensated_non_compete',
      name: 'Cam kết không cạnh tranh bất bình đẳng không có đền bù tài chính',
      keywords: ['không làm việc cho', 'không cạnh tranh', 'cùng ngành'],
      secondaryKeywords: ['năm', 'tháng', 'đối thủ'],
      statutoryCitation: 'Điều 35 Hiến pháp 2013 và Điều 5 Bộ luật Lao động 2019',
      reasonTemplate:
        'Điều khoản hạn chế quyền tự do làm việc của công dân (Điều 35 Hiến pháp 2013 và Điều 5 BLLĐ 2019). Để cam kết bảo mật & không cạnh tranh có hiệu lực công bằng, cần đi kèm khoản hỗ trợ tài chính cho người lao động.',
      suggestedWordingTemplate:
        'Kính đề nghị bổ sung khoản hỗ trợ tài chính hàng tháng trong thời gian người lao động thực hiện cam kết không làm việc cho các đơn vị cạnh tranh trực tiếp.',
      riskLevel: 'YELLOW_WARNING',
    },
  ],
  mandatoryClauses: [
    {
      type: 'COMPENSATION_SALARY',
      categoryTag: 'COMPENSATION_SALARY',
      description: 'Mức lương theo công việc, hình thức trả lương, thời hạn trả lương, phụ cấp lương và các khoản bổ sung khác.',
      statutoryReference: 'Điểm đ Khoản 1 Điều 21 Bộ luật Lao động 2019',
      importance: 'MANDATORY',
      keywords: ['tiền lương', 'mức lương', 'thù lao', 'trả lương', 'lương'],
    },
    {
      type: 'WORKING_HOURS',
      categoryTag: 'WORKING_HOURS',
      description: 'Thời giờ làm việc, thời giờ nghỉ ngơi của người lao động.',
      statutoryReference: 'Điểm e Khoản 1 Điều 21 Bộ luật Lao động 2019',
      importance: 'MANDATORY',
      keywords: ['thời giờ làm việc', 'thời gian làm việc', 'nghỉ ngơi', 'giờ làm'],
    },
    {
      type: 'SOCIAL_INSURANCE',
      categoryTag: 'SOCIAL_INSURANCE',
      description: 'Bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp theo quy định của pháp luật.',
      statutoryReference: 'Điểm f Khoản 1 Điều 21 Bộ luật Lao động 2019',
      importance: 'MANDATORY',
      keywords: ['bảo hiểm xã hội', 'bhxh', 'bảo hiểm y tế', 'bhyt', 'bảo hiểm thất nghiệp', 'bhtn'],
    },
    {
      type: 'LABOR_SAFETY',
      categoryTag: 'LABOR_SAFETY',
      description: 'Trang bị bảo hộ lao động cho người lao động và an toàn vệ sinh lao động.',
      statutoryReference: 'Điểm g Khoản 1 Điều 21 Bộ luật Lao động 2019',
      importance: 'MANDATORY',
      keywords: ['bảo hộ lao động', 'an toàn lao động', 'vệ sinh lao động', 'trang bị bảo hộ'],
    },
  ],
};

export const DEFAULT_RENTAL_POLICY: ContractPolicy = {
  category: 'rental',
  title: 'Chính sách Hợp đồng Thuê nhà theo Luật Nhà ở 2023',
  limits: [],
  prohibitions: [
    {
      id: 'unilateral_rent_increase',
      name: 'Tự ý tăng giá thuê bất kỳ lúc nào',
      keywords: ['tự ý tăng', 'tăng tiền thuê bất kỳ', 'điều chỉnh giá thuê bất kỳ', 'thị trường gia tăng'],
      statutoryCitation: 'Điều 165 Luật Nhà ở 2023',
      reasonTemplate:
        'Theo Điều 165 Luật Nhà ở 2023, giá thuê nhà do các bên thỏa thuận và chỉ được điều chỉnh khi có thỏa thuận rõ ràng hoặc đáp ứng các điều kiện cụ thể trong hợp đồng.',
      suggestedWordingTemplate:
        'Kính đề nghị sửa đổi: Giá thuê nhà ổn định trong suốt thời hạn hợp đồng. Mọi việc điều chỉnh giá thuê chỉ được thực hiện khi hai bên cùng đồng thuận bằng văn bản phụ lục hợp đồng.',
      riskLevel: 'YELLOW_WARNING',
    },
    {
      id: 'unfair_deposit_forfeiture',
      name: 'Tịch thu tiền đặt cọc bất hợp lý',
      keywords: ['tịch thu'],
      secondaryKeywords: ['tiền cọc', 'đặt cọc'],
      statutoryCitation: 'Điều 328 Bộ luật Dân sự 2015',
      reasonTemplate:
        'Điều khoản tịch thu toàn bộ tiền cọc đặt người thuê vào thế bất lợi nghiêm trọng. Tiền cọc phải được hoàn trả nếu bên thuê đã hoàn thành nghĩa vụ bàn giao nhà và chi phí.',
      suggestedWordingTemplate:
        'Đề nghị sửa đổi: Tiền đặt cọc sẽ được hoàn trả đầy đủ cho Bên thuê trong vòng 03 ngày làm việc kể từ ngày thanh lý hợp đồng và bàn giao hiện trạng nhà.',
      riskLevel: 'YELLOW_WARNING',
    },
  ],
  mandatoryClauses: [
    {
      type: 'RENTAL_PRICE',
      categoryTag: 'RENTAL_PRICE',
      description: 'Giá thuê nhà ở và phương thức, kỳ hạn thanh toán tiền thuê.',
      statutoryReference: 'Điểm c Khoản 1 Điều 163 Luật Nhà ở 2023',
      importance: 'MANDATORY',
      keywords: ['giá thuê', 'tiền thuê', 'thanh toán tiền thuê'],
    },
    {
      type: 'DEPOSIT_MAINTENANCE',
      categoryTag: 'DEPOSIT',
      description: 'Quyền và nghĩa vụ của các bên về sửa chữa, bảo trì nhà ở và điều kiện hoàn trả tiền đặt cọc.',
      statutoryReference: 'Điểm d Khoản 1 Điều 163 Luật Nhà ở 2023',
      importance: 'MANDATORY',
      keywords: ['bảo trì', 'sửa chữa', 'đặt cọc', 'hoàn cọc', 'tiền cọc'],
    },
  ],
};

export const DEFAULT_LOAN_POLICY: ContractPolicy = {
  category: 'civil_loan',
  title: 'Chính sách Hợp đồng Vay nợ theo Bộ luật Dân sự 2015',
  limits: [
    {
      metric: 'loan_interest_annual',
      threshold: 20,
      unit: 'percent',
      statutoryCitation: 'Khoản 1 Điều 468 Bộ luật Dân sự 2015',
      reasonTemplate:
        'Mức lãi suất thỏa thuận ({value}%/năm) vượt quá trần quy định không được vượt quá {threshold}%/năm của khoản tiền vay theo {citation}.',
      suggestedWordingTemplate:
        'Đề nghị điều chỉnh mức lãi suất vay không vượt quá {threshold}%/năm theo quy định tại {citation}.',
    },
  ],
  prohibitions: [],
  mandatoryClauses: [],
};

const DEFAULT_POLICIES: Record<string, ContractPolicy> = {
  labor: DEFAULT_LABOR_POLICY,
  rental: DEFAULT_RENTAL_POLICY,
  civil_loan: DEFAULT_LOAN_POLICY,
};

/**
 * Nhà cung cấp chính sách hợp đồng cơ sở (In-Memory / Configurable)
 */
export class DefaultContractPolicyProvider implements IContractPolicyProvider {
  private policies: Map<ContractCategory, ContractPolicy>;

  constructor(customPolicies?: Partial<Record<ContractCategory, ContractPolicy>>) {
    this.policies = new Map();
    for (const [key, policy] of Object.entries(DEFAULT_POLICIES)) {
      this.policies.set(key as ContractCategory, policy);
    }
    if (customPolicies) {
      for (const [key, policy] of Object.entries(customPolicies)) {
        if (policy) {
          this.policies.set(key as ContractCategory, policy);
        }
      }
    }
  }

  async getPolicy(category: ContractCategory): Promise<ContractPolicy> {
    const policy = this.policies.get(category);
    if (!policy) {
      return {
        category,
        title: `Chính sách ${category}`,
        limits: [],
        prohibitions: [],
        mandatoryClauses: [],
      };
    }
    return policy;
  }
}

/**
 * Nhà cung cấp chính sách động liên kết với bảng `public.system_configs` trên Supabase Cloud
 * Cho phép Web Admin cập nhật các quy tắc pháp lý trong thời gian thực mà KHÔNG cần sửa mã nguồn.
 */
export class SupabaseContractPolicyProvider implements IContractPolicyProvider {
  private fallbackProvider: DefaultContractPolicyProvider;
  private supabaseClient?: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient, fallbackPolicies?: Partial<Record<ContractCategory, ContractPolicy>>) {
    this.supabaseClient = supabaseClient;
    this.fallbackProvider = new DefaultContractPolicyProvider(fallbackPolicies);
  }

  async getPolicy(category: ContractCategory): Promise<ContractPolicy> {
    if (!this.supabaseClient) {
      return this.fallbackProvider.getPolicy(category);
    }

    try {
      const { data, error } = await this.supabaseClient
        .from('system_configs')
        .select('value')
        .eq('key', `contract_policy_${category}`)
        .maybeSingle();

      if (error || !data || !data.value) {
        return this.fallbackProvider.getPolicy(category);
      }

      return data.value as ContractPolicy;
    } catch {
      return this.fallbackProvider.getPolicy(category);
    }
  }
}
