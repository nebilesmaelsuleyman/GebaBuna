import { REFERENCE_PRICES, PRICE_SOURCE_NOTE } from '@/utils/coffeePrices';
import {
  User,
  FarmerProfile,
  BuyerProfile,
  Listing,
  Offer,
  Trade,
  MarketPrice,
  AdminStats,
  PublicStats,
  AdminUserRow,
  AdminTradeRow,
  AdminAuditEntry,
  TraceabilityData,
  BilateralSummary,
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const OFFLINE_EVENT = 'buna:offline';
export const SESSION_EXPIRED_EVENT = 'buna:session-expired';

export class ApiError extends Error {
  constructor(message: string, public status: number, public offline: boolean) {
    super(message);
  }
}

/** Photo grading failed for any reason; photoUrl is set when the photo was uploaded before the failure. */
export class AiGradingError extends ApiError {
  constructor(message: string, status: number, public photoUrl?: string) {
    super(message, status, status === 0);
  }

  /** Banner title for the manual-entry form. */
  get title(): string {
    if (this.status === 422) return 'AI could not grade this photo';
    if (this.status === 0) return 'Cannot reach the server';
    return 'AI is not responding right now';
  }
}

/** Sample data is only allowed when the server cannot be reached at all. */
function isOffline(err: unknown): boolean {
  if (err instanceof ApiError && err.offline) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(OFFLINE_EVENT));
    return true;
  }
  return false;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('buna_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } catch {
      throw new ApiError('Cannot reach the Buna server. Make sure the backend is running on port 5000.', 0, true);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && token && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
      throw new ApiError(data.message || `Request failed with status ${res.status}`, res.status, false);
    }
    return data;
  }

  // Auth
  async login(identifier: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  }

  async requestOtp(phone: string): Promise<{ success: boolean; message: string; code: string; phone: string }> {
    return this.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async otpLogin(phone: string, code: string, extra?: { role?: string; fullName?: string }): Promise<{ success: boolean; token: string; user: User; note?: string }> {
    return this.request('/auth/otp-login', {
      method: 'POST',
      body: JSON.stringify({ phone, code, ...extra }),
    });
  }

  async register(data: any): Promise<{ success: boolean; token: string; user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<{ success: boolean; user: User; profile: FarmerProfile | BuyerProfile }> {
    return this.request('/auth/me');
  }

  // Market Prices
  async getMarketPrices(): Promise<{ success: boolean; data: MarketPrice[]; source: string }> {
    try {
      return await this.request('/market-prices');
    } catch (err) {
      if (!isOffline(err)) throw err;
            return {
        success: true,
        source: 'Offline sample data',
        data: (['washed', 'natural'] as const).flatMap((processing) =>
          (Object.keys(REFERENCE_PRICES[processing]) as Array<keyof (typeof REFERENCE_PRICES)['washed']>).map((grade) => {
            const price = REFERENCE_PRICES[processing][grade];
            return {
              _id: `mp-${processing}-${grade}`,
              coffeeType: `Jimma ${processing === 'washed' ? 'Washed' : 'Natural'} ${grade}`,
              processing,
              grade,
              currentPricePerKgETB: price.current,
              floorPricePerKgETB: price.floor,
              ceilingPricePerKgETB: price.ceiling,
              source: PRICE_SOURCE_NOTE,
              lastUpdated: new Date().toISOString(),
              history: [0.94, 0.96, 0.98, 1].map((factor, index) => ({
                date: new Date(Date.now() - (30 - index * 10) * 86400000).toISOString().slice(0, 10),
                pricePerKgETB: Math.round((price.current * factor) / 5) * 5,
              })),
            };
          })
        ),
      };
    }
  }

  /**
   * Trigger the server to refresh ECX prices from the live internet.
   * Only accessible to admins.
   */
  async refreshMarketPrices(): Promise<{
    success: boolean;
    message: string;
    updated: number;
    sourceUsed: string;
    refreshedAt: string;
  }> {
    return this.request('/market-prices/refresh', { method: 'POST' });
  }

  async getPriceHistory(grade = 'Grade 1', processing = 'washed'): Promise<any> {
    try {
      return await this.request(`/market-prices/history?grade=${grade}&processing=${processing}`);
    } catch (err) {
      if (!isOffline(err)) throw err;
      return {
        success: true,
        coffeeType: `Jimma ${processing} ${grade}`,
        grade,
        processing,
        currentPrice: 1150,
        history: [
          { date: '2026-10-16', pricePerKgETB: 1080 },
          { date: '2026-10-23', pricePerKgETB: 1100 },
          { date: '2026-10-30', pricePerKgETB: 1115 },
          { date: '2026-11-06', pricePerKgETB: 1130 },
          { date: '2026-11-13', pricePerKgETB: 1150 },
        ],
      };
    }
  }

  // Listings
  async getListings(params: Record<string, string> = {}): Promise<{ success: boolean; data: Listing[]; count: number }> {
    const qs = new URLSearchParams(params).toString();
    try {
      return await this.request(`/listings?${qs}`);
    } catch (err) {
      if (!isOffline(err)) throw err;
      // Return sample listings
      return {
        success: true,
        count: 3,
        data: [
          {
            _id: 'list-1',
            farmer: { _id: 'u1', fullName: 'Gemechu Daba', phone: '+251917112233' },
            farmerProfile: { _id: 'fp1', averageQualityScore: 89, woreda: 'Mana', badge: 'Gold' },
            title: 'Highland Specialty Washed Lot - Mana Woreda',
            variety: 'Jimma Heirloom 74110',
            grade: 'Specialty',
            processing: 'washed',
            harvestYear: 2026,
            quantityKg: 2500,
            askingPricePerKg: 1290,
            marketReferencePrice: 1260,
            priceDiffPercentage: 2.4,
            isFairPrice: true,
            location: { region: 'Oromia', zone: 'Jimma', woreda: 'Mana', kebele: 'Kenteri' },
            cuppingScore: 88.5,
            moisturePercentage: 11.2,
            certifications: ['Organic Certified', 'Rainforest Alliance'],
            photos: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'],
            status: 'open',
            createdAt: new Date().toISOString(),
          },
          {
            _id: 'list-2',
            farmer: { _id: 'u2', fullName: 'Chaltu Tolosa', phone: '+251917223344' },
            farmerProfile: { _id: 'fp2', averageQualityScore: 86, woreda: 'Gomma', badge: 'Silver' },
            title: 'Gomma Grade 1 Sun-Dried Natural Arabica',
            variety: 'Heirloom Selection 74112',
            grade: 'Grade 1',
            processing: 'natural',
            harvestYear: 2026,
            quantityKg: 1800,
            askingPricePerKg: 1095,
            marketReferencePrice: 1080,
            priceDiffPercentage: 1.4,
            isFairPrice: true,
            location: { region: 'Oromia', zone: 'Jimma', woreda: 'Gomma', kebele: 'Genji' },
            cuppingScore: 86.0,
            moisturePercentage: 11.5,
            certifications: ['Fairtrade'],
            photos: ['https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80'],
            status: 'open',
            createdAt: new Date().toISOString(),
          },
          {
            _id: 'list-3',
            farmer: { _id: 'u3', fullName: 'Abdi Gemeda', phone: '+251917334455' },
            farmerProfile: { _id: 'fp3', averageQualityScore: 84, woreda: 'Limmu Kosa', badge: 'Bronze' },
            title: 'Limmu Washed Grade 2 Export Quality Lot',
            variety: 'Buna Jimmaa Traditional',
            grade: 'Grade 2',
            processing: 'washed',
            harvestYear: 2026,
            quantityKg: 4000,
            askingPricePerKg: 1055,
            marketReferencePrice: 1040,
            priceDiffPercentage: 1.4,
            isFairPrice: true,
            location: { region: 'Oromia', zone: 'Jimma', woreda: 'Limmu Kosa', kebele: 'Babu' },
            cuppingScore: 84.5,
            moisturePercentage: 11.8,
            certifications: ['ECX Registered'],
            photos: ['https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80'],
            status: 'open',
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
  }

  async getListingById(id: string): Promise<{ success: boolean; data: Listing }> {
    return this.request(`/listings/${id}`);
  }

  async createListing(data: any): Promise<{ success: boolean; listing: Listing; fairnessWarning?: any }> {
    return this.request('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateListing(id: string, data: Record<string, unknown>): Promise<{ success: boolean; listing: Listing }> {
    return this.request(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteListing(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/listings/${id}`, { method: 'DELETE' });
  }

  async getMyListings(): Promise<{ success: boolean; listings: Listing[] }> {
    return this.request('/listings/my');
  }

  // Offers
  async getOffers(): Promise<{ success: boolean; data: Offer[] }> {
    try {
      return await this.request('/offers');
    } catch (err) {
      if (!isOffline(err)) throw err;
      return { success: true, data: [] };
    }
  }

  async createOffer(data: any): Promise<{ success: boolean; data: Offer }> {
    return this.request('/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getIncomingOffers(): Promise<{ success: boolean; offers: any[] }> {
    return this.request('/offers/incoming');
  }

  async getOutgoingOffers(): Promise<{ success: boolean; offers: any[] }> {
    return this.request('/offers/outgoing');
  }

  async acceptOffer(id: string): Promise<{ success: boolean; trade: any }> {
    return this.request(`/offers/${id}/accept`, { method: 'POST' });
  }

  async rejectOffer(id: string): Promise<{ success: boolean; offer: any }> {
    return this.request(`/offers/${id}/reject`, { method: 'POST' });
  }

  async counterOffer(
    id: string,
    payload: { counterPricePerKg: number; counterQuantityKg?: number; counterMessage?: string }
  ): Promise<{ success: boolean; offer: any; round?: number; isFinalTurn?: boolean }> {
    return this.request(`/offers/${id}/counter`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTraceabilityProfile(userId: string): Promise<{ success: boolean } & TraceabilityData> {
    return this.request(`/profiles/traceability/${userId}`);
  }

  async getBilateralTradeHistory(otherUserId: string): Promise<{
    success: boolean;
    trades: any[];
    summary: BilateralSummary;
  }> {
    return this.request(`/trades/bilateral/${otherUserId}`);
  }

  async getTrades(): Promise<{ success: boolean; trades: Trade[] }> {
    return this.request('/trades');
  }

  async getTrade(tradeId: string): Promise<{ success: boolean; trade: Trade }> {
    return this.request(`/trades/${tradeId}`);
  }

  async confirmTradeDelivery(tradeId: string, deliveryNotes?: string): Promise<{ success: boolean; trade: Trade }> {
    return this.request(`/trades/${tradeId}/confirm-delivery`, {
      method: 'POST',
      body: JSON.stringify({ deliveryNotes }),
    });
  }

  async confirmTradePayment(
    tradeId: string,
    paymentNotes?: string,
    paymentMethod?: string
  ): Promise<{ success: boolean; trade: Trade; note?: string }> {
    return this.request(`/trades/${tradeId}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify({ paymentNotes, paymentMethod }),
    });
  }

  // Leaderboard
  async getFarmerLeaderboard(woreda = 'all'): Promise<{ success: boolean; data: any[] }> {
    try {
      return await this.request(`/leaderboard/farmers?woreda=${woreda}`);
    } catch (err) {
      if (!isOffline(err)) throw err;
      return {
        success: true,
        data: [
          {
            rank: 1,
            id: 'f1',
            fullName: 'Gemechu Daba',
            woreda: 'Mana',
            zone: 'Jimma',
            qualityScore: 89.2,
            totalKgSold: 12500,
            completedTrades: 8,
            badge: 'Gold',
            averageRating: 4.9,
          },
          {
            rank: 2,
            id: 'f2',
            fullName: 'Chaltu Tolosa',
            woreda: 'Gomma',
            zone: 'Jimma',
            qualityScore: 87.5,
            totalKgSold: 9800,
            completedTrades: 6,
            badge: 'Silver',
            averageRating: 4.8,
          },
          {
            rank: 3,
            id: 'f3',
            fullName: 'Abdi Gemeda',
            woreda: 'Limmu Kosa',
            zone: 'Jimma',
            qualityScore: 85.0,
            totalKgSold: 8400,
            completedTrades: 5,
            badge: 'Bronze',
            averageRating: 4.7,
          },
          {
            rank: 4,
            id: 'f4',
            fullName: 'Fatuma Aliyi',
            woreda: 'Agaro',
            zone: 'Jimma',
            qualityScore: 84.1,
            totalKgSold: 7100,
            completedTrades: 4,
            badge: 'Verified Farmer',
            averageRating: 4.6,
          },
        ],
      };
    }
  }

  async getBuyerLeaderboard(): Promise<{ success: boolean; data: any[] }> {
    try {
      return await this.request('/leaderboard/buyers');
    } catch (err) {
      if (!isOffline(err)) throw err;
      return {
        success: true,
        data: [
          {
            rank: 1,
            id: 'b1',
            companyName: 'Oromia Coffee Farmers Cooperative Union',
            ownerName: 'Dejene Dadi',
            businessType: 'cooperative_union',
            fairnessScore: 96,
            totalKgBought: 45000,
            numberCompletedTrades: 18,
            averageRating: 4.9,
            fairnessBadge: 'Fair Buyer Certified',
          },
          {
            rank: 2,
            id: 'b2',
            companyName: 'Jimma Specialty Roasters & Exporters',
            ownerName: 'Sara Bekele',
            businessType: 'roaster',
            fairnessScore: 92,
            totalKgBought: 28000,
            numberCompletedTrades: 12,
            averageRating: 4.8,
            fairnessBadge: 'Fair Buyer Certified',
          },
          {
            rank: 3,
            id: 'b3',
            companyName: 'Limmu Highlands Export Co.',
            ownerName: 'Tariku Feyisa',
            businessType: 'exporter',
            fairnessScore: 88,
            totalKgBought: 32000,
            numberCompletedTrades: 14,
            averageRating: 4.6,
            fairnessBadge: 'Standard Verified',
          },
        ],
      };
    }
  }

  // Admin
  async getPublicStats(): Promise<{ success: boolean; data: PublicStats }> {
    return this.request('/stats/public');
  }

  async getAdminStats(): Promise<{ success: boolean; stats: AdminStats; flaggedBuyers: any[]; chartData: any[] }> {
    try {
      return await this.request('/admin/dashboard-stats');
    } catch (err) {
      if (!isOffline(err)) throw err;
      return {
        success: true,
        stats: {
          totalFarmers: 6,
          totalBuyers: 5,
          pendingVerifications: 1,
          totalListings: 15,
          completedTrades: 6,
          totalKgTraded: 34500,
          totalETBValue: 14350000,
          avgPricePaid: 1105.5,
          avgMarketPrice: 1080.0,
          fairnessRatioOverall: 102,
          flaggedBuyersCount: 1,
        },
        flaggedBuyers: [
          {
            _id: 'fb1',
            companyName: 'Red Sea Middlemen Trading Ltd',
            fairnessScore: 42,
            totalKgBought: 4200,
            numberCompletedTrades: 2,
            reason: 'Consistently offering 25% below ECX floor price to vulnerable smallholders',
          },
        ],
        chartData: [
          { month: 'Jul', marketPrice: 900, paidPrice: 830, fairRatio: 92 },
          { month: 'Aug', marketPrice: 940, paidPrice: 895, fairRatio: 95 },
          { month: 'Sep', marketPrice: 985, paidPrice: 965, fairRatio: 98 },
          { month: 'Oct', marketPrice: 1030, paidPrice: 1040, fairRatio: 101 },
          { month: 'Nov', marketPrice: 1080, paidPrice: 1095, fairRatio: 101 },
        ],
      };
    }
  }

  async getPendingBuyers(): Promise<{ success: boolean; buyers: any[] }> {
    try {
      return await this.request('/admin/buyers/pending');
    } catch (err) {
      if (!isOffline(err)) throw err;
      return {
        success: true,
        buyers: [
          {
            _id: 'pb1',
            companyName: 'Abba Jifar Trading PLC',
            ownerName: 'Kedir Abba Fita',
            businessType: 'exporter',
            phone: '+251 917 554 433',
            email: 'kedir@abbajifar.com',
            tradeLicenseNumber: 'ET-JIM-2025-0988',
            tinNumber: '0054321987',
            verificationStatus: 'pending',
            licenseDocumentUrl: '/uploads/sample_license.pdf',
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
  }

  async verifyBuyer(
    buyerId: string,
    action: 'approve' | 'reject' | 'suspend',
    notes?: string,
    reason?: string,
    checklist?: {
      validTradeLicense: boolean;
      validExportLicense: boolean;
      tinValid: boolean;
      noPastViolations: boolean;
    }
  ): Promise<any> {
    return this.request(`/admin/buyers/${buyerId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ action, notes, reason, checklist }),
    });
  }

  async getAdminUsers(
    role: 'farmer' | 'buyer',
    status: 'all' | 'active' | 'removed' = 'all',
    q = ''
  ): Promise<{ success: boolean; users: AdminUserRow[] }> {
    const qs = new URLSearchParams({ role, status, q }).toString();
    return this.request(`/admin/users?${qs}`);
  }

  async getAdminTrades(status = 'all'): Promise<{ success: boolean; trades: AdminTradeRow[] }> {
    return this.request(`/admin/trades?status=${encodeURIComponent(status)}`);
  }

  async removeUser(userId: string, reason: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/users/${userId}/remove`, { method: 'POST', body: JSON.stringify({ reason }) });
  }

  async restoreUser(userId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/users/${userId}/restore`, { method: 'POST', body: JSON.stringify({}) });
  }

  async getAuditLog(): Promise<{ success: boolean; entries: AdminAuditEntry[] }> {
    return this.request('/admin/audit-log');
  }

  async transcribeVoice(payload: { audioBlob?: Blob; audioBase64?: string; language?: string; textHint?: string }): Promise<any> {
    let response: Response;

    if (payload.audioBlob) {
      const formData = new FormData();
      const filename = payload.audioBlob.type.includes('wav') ? 'recording.wav' : 'recording.webm';
      formData.append('audio', payload.audioBlob, filename);
      if (payload.language) formData.append('language', payload.language);
      response = await fetch(`${API_BASE}/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });
    } else {
      response = await fetch(`${API_BASE}/voice/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Voice service unavailable');
    }
    return data;
  }

  async synthesizeVoice(text: string, language: string = 'om', voiceId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, voiceId }),
    });
    return res.json();
  }

  async processVoiceAssistantStep(step: string, language: string, audioBlob?: Blob, textHint?: string): Promise<any> {
    const formData = new FormData();
    formData.append('step', step);
    formData.append('language', language);
    if (audioBlob) formData.append('audio', audioBlob, 'recording.webm');
    if (textHint) formData.append('textHint', textHint);

    const res = await fetch(`${API_BASE}/voice/assistant-step`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  }

  // AI Coffee Bean Analysis
  async analyzeCoffeePhoto(photo: File, location?: { woreda: string; kebele: string }): Promise<{ success: boolean; photoUrl: string; analysis: any; location?: any }> {
    const formData = new FormData();
    formData.append('photo', photo);
    if (location?.woreda) formData.append('woreda', location.woreda);
    if (location?.kebele) formData.append('kebele', location.kebele);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/ai/analyze-coffee`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch {
      throw new AiGradingError('The photo could not be sent to the server. Enter the grade and price yourself.', 0);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AiGradingError(
        data.message || `AI grading failed (HTTP ${res.status}). Enter the grade and price yourself.`,
        res.status,
        data.photoUrl,
      );
    }
    return data;
  }

  async getFarmerProfile(): Promise<any> {
    return this.request('/profiles/farmer/me');
  }

  async updateFarmerProfile(payload: Record<string, unknown>): Promise<any> {
    return this.request('/profiles/farmer/me', { method: 'PUT', body: JSON.stringify(payload) });
  }

  async uploadFarmerPhoto(photo: File): Promise<any> {
    const formData = new FormData();
    formData.append('photo', photo);
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/profiles/farmer/me/photo`, { method: 'POST', headers, body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not upload profile photo');
    return data;
  }

  async getBuyerProfile(): Promise<any> {
    return this.request('/profiles/buyer/me');
  }

  async updateBuyerProfile(payload: Record<string, unknown>): Promise<any> {
    return this.request('/profiles/buyer/me', { method: 'PUT', body: JSON.stringify(payload) });
  }

  async uploadBuyerDocument(file: File, docType: string, title: string): Promise<any> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('docType', docType);
    formData.append('title', title);
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/profiles/buyer/upload-document`, { method: 'POST', headers, body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not upload document');
    return data;
  }

  async analyzeCoffeePhotoUrl(imageUrl: string): Promise<{ success: boolean; photoUrl: string; analysis: any }> {
    return this.request('/ai/analyze-coffee-url', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  }
}

export const api = new ApiClient();
