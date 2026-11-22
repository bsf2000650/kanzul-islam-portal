export type Option = { label: string; value: string }

type Rules = { required?: boolean; format?: "email" | "phone" | "digits" | "url" | "hex" | "slug"; min?: number; max?: number; maxLength?: number }

export type Field =
  | ({ key: string; label: string; type: "text" | "textarea" | "richtext" | "image" | "color" | "url" | "number" | "boolean" | "tags"; help?: string; minItems?: number } & Rules)
  | ({ key: string; label: string; type: "select"; options: Option[]; help?: string } & Rules)
  | { key: string; label: string; type: "group"; fields: Field[]; help?: string }
  | { key: string; label: string; type: "list"; itemLabel: string; titleField?: string; fields: Field[]; help?: string; minItems?: number; uniqueKey?: string }
  | { key: string; label: string; type: "table"; help?: string; minColumns?: number }

export type Section = { key: string; title: string; description?: string; fields: Field[] }
export type PageDef = { key: string; title: string; description: string; sections: Section[] }
export type PageSummary = { key: string; title: string; description: string; updatedAt: string | null }

export type Content = Record<string, Record<string, unknown>>

export type Paged<T> = { items: T[]; total: number; page: number; limit: number; pages: number }

export type Role = {
  _id: string; name: string; description: string; permissions: string[]; isSystem: boolean; userCount?: number
}
export type PermissionGroup = { resource: string; label: string; actions: string[] }

export type AppUser = {
  _id: string; name: string; email: string; isActive: boolean; role: Role | null; lastLoginAt?: string; createdAt: string
}

export type Student = {
  _id: string; rollNo: string; name: string; fatherName: string; email: string; phone: string; cnic: string; address: string
  course: string; batch: string; admissionDate: string; totalFee: number; status: "active" | "completed" | "dropped"; notes: string
  paid?: number; remaining?: number; feeCleared?: boolean
}

export type Faculty = {
  _id: string; name: string; email: string; phone: string; designation: string; department: string; qualification: string
  experience: string; courses: string[]; photo: string; joiningDate?: string | null; isActive: boolean; notes: string
}

export type FeeSummaryRow = Student & { paid: number; remaining: number; feeStatus: "paid" | "partial" | "unpaid"; lastPaidOn?: string }
export type FeePayment = {
  _id: string; student: { _id: string; name: string; rollNo?: string; course?: string } | string; amount: number
  paidOn: string; method: string; receiptNo: string; note: string
}

export type Inquiry = {
  _id: string; name: string; email: string; phone: string; course: string; message: string; source: string
  status: "new" | "in_progress" | "resolved" | "closed"; adminNote: string; createdAt: string
}
