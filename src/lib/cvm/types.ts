export type ManagementReport = {
  type: string
  referenceDate: string | null
  deliveryDate: string
  url: string
}

export type ManagementReportsResult =
  | { available: true; reports: ManagementReport[] }
  | { available: false; reason: string; message: string }
