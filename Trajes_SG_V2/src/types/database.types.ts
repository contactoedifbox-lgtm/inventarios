transactions: {
  Row: {
    id: string;
    suit_id: string;
    suit_title: string;
    suit_photo: string;
    buyer_or_renter_id: string;
    buyer_or_renter_name: string;
    buyer_or_renter_email: string | null;
    owner_id: string;
    owner_name: string;
    type: string;
    price: number;
    event_name: string | null;
    transfer_receipt_url: string | null;
    status: string;
    created_at: string;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    suit_id: string;
    suit_title: string;
    suit_photo: string;
    buyer_or_renter_id: string;
    buyer_or_renter_name: string;
    buyer_or_renter_email?: string | null;
    owner_id: string;
    owner_name: string;
    type: string;
    price: number;
    event_name?: string | null;
    transfer_receipt_url?: string | null;
    status?: string;
    created_at?: string;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    suit_id?: string;
    suit_title?: string;
    suit_photo?: string;
    buyer_or_renter_id?: string;
    buyer_or_renter_name?: string;
    buyer_or_renter_email?: string | null;
    owner_id?: string;
    owner_name?: string;
    type?: string;
    price?: number;
    event_name?: string | null;
    transfer_receipt_url?: string | null;
    status?: string;
    created_at?: string;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'transactions_suit_id_fkey';
      columns: ['suit_id'];
      isOneToOne: false;
      referencedRelation: 'costumes';
      referencedColumns: ['id'];
    }
  ];
},
