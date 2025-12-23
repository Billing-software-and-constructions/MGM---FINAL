import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Filter, Eye, Printer } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfDay, endOfDay, setYear, getYear } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import toast from "react-hot-toast";
import { PrintableBill } from "@/components/PrintableBill";

// Helper function to get current date in IST
const getISTDate = () => {
  const istDateString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istDateString);
};

interface Bill {
  id: string;
  customer_name: string;
  bill_date: string;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  gold_rate?: number;
  gst_percentage?: number;
  invoice_number?: string;
}

interface BillItem {
  id: string;
  category_name: string;
  weight: number;
  gold_amount: number;
  seikuli_amount: number;
  seikuli_rate: number;
}

interface OldExchange {
  id: string;
  customer_name: string;
  created_at: string;
  category_name: string;
  subcategory_name?: string;
  initial_weight: number;
  final_weight: number;
  exchange_value: number;
  metal_rate: number;
  exchange_type: string;
  bill_id?: string;
  invoice_number?: string;
}

const BillHistory = () => {
  const todayIST = getISTDate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [oldExchanges, setOldExchanges] = useState<OldExchange[]>([]);
  const [startDate, setStartDate] = useState<Date>(todayIST);
  const [endDate, setEndDate] = useState<Date>(todayIST);
  const [selectedYear, setSelectedYear] = useState<number>(getYear(todayIST));
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("bills");
  const [selectedExchange, setSelectedExchange] = useState<OldExchange | null>(null);
  const [isExchangeDialogOpen, setIsExchangeDialogOpen] = useState(false);

  // Generate year options from 2020 to 2099
  const yearOptions = Array.from({ length: 80 }, (_, i) => 2020 + i);

  useEffect(() => {
    // Load data for current date by default
    if (activeTab === "bills") {
      loadBills();
    } else {
      loadOldExchanges();
    }

    // Set up real-time subscriptions
    const billsChannel = supabase
      .channel('bills-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills'
        },
        () => {
          if (activeTab === "bills") loadBills();
        }
      )
      .subscribe();

    const exchangesChannel = supabase
      .channel('exchanges-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'old_exchanges'
        },
        () => {
          if (activeTab === "old-exchanges") loadOldExchanges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(billsChannel);
      supabase.removeChannel(exchangesChannel);
    };
  }, [startDate, endDate, activeTab]);

  const loadBills = async () => {
    try {
      setLoading(true);
      
      // Get start and end of day in ISO format
      const startOfDayISO = startOfDay(startDate).toISOString();
      const endOfDayISO = endOfDay(endDate).toISOString();

      let query = supabase
        .from('bills' as any)
        .select('*')
        .gte('bill_date', startOfDayISO)
        .lte('bill_date', endOfDayISO);

      // Add invoice number filter if provided
      if (invoiceNumber.trim()) {
        query = query.ilike('invoice_number', `%${invoiceNumber.trim()}%`);
      }

      const { data, error } = await query.order('bill_date', { ascending: false });

      if (error) throw error;

      setBills((data as any) || []);
    } catch (error) {
      console.error('Error loading bills:', error);
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const loadOldExchanges = async () => {
    try {
      setLoading(true);
      
      // Get start and end of day in ISO format
      const startOfDayISO = startOfDay(startDate).toISOString();
      const endOfDayISO = endOfDay(endDate).toISOString();

      const { data, error } = await supabase
        .from('old_exchanges' as any)
        .select(`
          *,
          bills!bill_id (
            invoice_number
          )
        `)
        .gte('created_at', startOfDayISO)
        .lte('created_at', endOfDayISO)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data to include invoice_number at the top level
      const mappedData = ((data as any) || []).map((exchange: any) => ({
        ...exchange,
        invoice_number: exchange.bills?.invoice_number || null,
        bills: undefined, // Remove nested bills object
      }));

      setOldExchanges(mappedData);
    } catch (error) {
      console.error('Error loading old exchanges:', error);
      toast.error("Failed to load old exchanges");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    setIsFiltering(true);
    if (activeTab === "bills") {
      loadBills();
    } else {
      loadOldExchanges();
    }
    setIsFiltering(false);
  };

  const handleDateChange = (date: Date | undefined, isStartDate: boolean) => {
    if (date) {
      if (isStartDate) {
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      // Automatically update year dropdown when date changes
      const yearFromDate = getYear(date);
      if (yearFromDate !== selectedYear) {
        setSelectedYear(yearFromDate);
      }
    }
  };

  const handleResetFilter = () => {
    const today = getISTDate();
    setStartDate(today);
    setEndDate(today);
    setSelectedYear(getYear(today));
    setInvoiceNumber("");
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year);
    setSelectedYear(newYear);
    // Update dates to the selected year
    const newStartDate = setYear(startDate, newYear);
    const newEndDate = setYear(endDate, newYear);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleViewDetails = async (bill: Bill) => {
    setSelectedBill(bill);
    setIsDialogOpen(true);
    setLoadingDetails(true);
    
    try {
      const { data, error } = await supabase
        .from('bill_items' as any)
        .select('*')
        .eq('bill_id', bill.id);

      if (error) throw error;

      setBillItems((data as any) || []);
    } catch (error) {
      console.error('Error loading bill details:', error);
      toast.error("Failed to load bill details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewExchangeDetails = (exchange: OldExchange) => {
    setSelectedExchange(exchange);
    setIsExchangeDialogOpen(true);
  };

  const handlePrintBill = () => {
    window.print();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-2xl font-bold">Bill History</h1>
                    <p className="text-sm text-muted-foreground">View past billing records</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 bg-gradient-to-br from-background via-accent/20 to-background">
            <div className="container mx-auto px-6 py-8 max-w-6xl">
              {/* Date Filter Section */}
              <Card className="border-0 shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Date Filters
                  </CardTitle>
                  <CardDescription>
                    Filter bills by date range
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-end gap-4">
                      {/* Invoice Number */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-sm font-medium mb-2 block">Invoice Number</label>
                        <Input
                          placeholder="Search by invoice number..."
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-end gap-4">
                      {/* Start Date */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-sm font-medium mb-2 block">Start Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => handleDateChange(date, true)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* End Date */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium mb-2 block">End Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => handleDateChange(date, false)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Year Selector */}
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-sm font-medium mb-2 block">Year</label>
                      <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                      {/* Filter Buttons */}
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleApplyFilter}
                          disabled={isFiltering}
                          className="gap-2"
                        >
                          <Filter className="h-4 w-4" />
                          Apply Filter
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={handleResetFilter}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for Bills and Old Exchanges */}
              <Card className="border-0 shadow-lg">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <CardHeader>
                    <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                      <TabsTrigger value="bills">Regular Bills</TabsTrigger>
                      <TabsTrigger value="old-exchanges">Old Exchange Bills</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  
                  <CardContent>
                    <TabsContent value="bills" className="mt-0">
                      <div className="mb-4">
                        <CardDescription>
                          {loading ? "Loading..." : `${bills.length} bill(s) found for ${format(startDate, "PP")}`}
                          {!loading && startDate.getTime() !== endDate.getTime() && ` - ${format(endDate, "PP")}`}
                        </CardDescription>
                      </div>
                      {loading ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">Loading bills...</p>
                        </div>
                      ) : bills.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground mb-4">No bills found for the selected date range</p>
                          <Link to="/billing">
                            <Button>Create New Bill</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {bills.map((bill) => (
                            <div
                              key={bill.id}
                              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors gap-4"
                            >
                              <div className="flex-1">
                                <div className="font-semibold text-lg">
                                  {bill.customer_name}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {format(new Date(bill.bill_date), "PPP")} • {format(new Date(bill.bill_date), "p")}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Grand Total</div>
                                <div className="text-2xl font-bold text-primary">
                                  ₹{Number(bill.grand_total).toLocaleString()}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(bill)}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="old-exchanges" className="mt-0">
                      <div className="mb-4">
                        <CardDescription>
                          {loading ? "Loading..." : `${oldExchanges.length} exchange(s) found for ${format(startDate, "PP")}`}
                          {!loading && startDate.getTime() !== endDate.getTime() && ` - ${format(endDate, "PP")}`}
                        </CardDescription>
                      </div>
                      {loading ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">Loading old exchanges...</p>
                        </div>
                      ) : oldExchanges.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground mb-4">No old exchanges found for the selected date range</p>
                          <Link to="/old-gold-exchange">
                            <Button>Create New Exchange</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {oldExchanges.map((exchange) => (
                            <div
                              key={exchange.id}
                              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors gap-4"
                            >
                              <div className="flex-1">
                                <div className="font-semibold text-lg">
                                  {exchange.customer_name}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {format(new Date(exchange.created_at), "PPP")} • {format(new Date(exchange.created_at), "p")}
                                </div>
                                <div className="text-sm mt-2">
                                  <span className="font-medium">{exchange.category_name}</span>
                                  {exchange.subcategory_name && <span className="text-muted-foreground"> - {exchange.subcategory_name}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-1">
                                  {exchange.initial_weight}g → {exchange.final_weight}g
                                </div>
                                <div className="text-xs text-muted-foreground mb-1">
                                  {exchange.exchange_type} • ₹{exchange.metal_rate}/g
                                </div>
                                <div className="text-2xl font-bold text-primary">
                                  ₹{Number(exchange.exchange_value).toLocaleString()}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewExchangeDetails(exchange)}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
          </main>
          
          <Footer />
        </div>
      </div>

      {/* Bill Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="flex items-center justify-between">
              <span>Bill Details</span>
              <Button onClick={handlePrintBill} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Bill
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading details...</p>
            </div>
          ) : selectedBill ? (
            <div className="p-4 bg-white text-black">
              {/* Invoice Header */}
              <div className="border-2 border-black">
                <div className="text-center py-3 border-b border-black">
                  <img src="/lovable-uploads/mgm-logo.jpg" alt="MGM Jewellers Logo" className="h-16 mx-auto mb-1" 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <p className="text-sm">Ph: 9842112416 | +91 96885 01717</p>
                </div>
                
                <div className="text-center py-2 border-b border-black">
                  <p className="text-base font-bold">SALE INVOICE</p>
                </div>

                {/* Company and Invoice Details */}
                <div className="grid grid-cols-2 gap-4 p-3 text-sm border-b border-black">
                  <div>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="font-semibold py-0.5">Shop Name</td>
                          <td className="py-0.5">: MGM JEWELLERS</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-0.5 align-top">Address</td>
                          <td className="py-0.5">: 326/1 Rajapalayam Main Road,<br />Sankarankovil-627756</td>
                        </tr>
                        {selectedBill.gst_amount > 0 && (
                          <tr>
                            <td className="font-semibold py-0.5">GSTIN</td>
                            <td className="py-0.5">: 33ABLFM1188M1ZU</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="font-semibold py-0.5">SI No of Invoice</td>
                          <td className="py-0.5">: {selectedBill.invoice_number || '-'}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-0.5">Date of Invoice</td>
                          <td className="py-0.5">: {format(new Date(selectedBill.bill_date), "dd/MM/yyyy")}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="p-3 text-sm border-b border-black">
                  <p className="font-bold mb-1">Details of Receiver (Billed to)</p>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="font-semibold py-0.5">Name</td>
                        <td className="py-0.5">: {selectedBill.customer_name}</td>
                      </tr>
                      <tr>
                        <td className="font-semibold py-0.5">Address</td>
                        <td className="py-0.5">: Sankarankovil</td>
                      </tr>
                      <tr>
                        <td className="font-semibold py-0.5">Phone</td>
                        <td className="py-0.5">: -</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-black bg-gray-100">
                        <th className="border-r border-black p-2 text-center">S.NO</th>
                        <th className="border-r border-black p-2 text-left">Category</th>
                        <th className="border-r border-black p-2 text-left">Subcategory</th>
                        <th className="border-r border-black p-2 text-center">Weight (grams)</th>
                        <th className="border-r border-black p-2 text-right">Rate per gram</th>
                        <th className="p-2 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billItems.map((item, index) => {
                        const totalPrice = item.gold_amount + item.seikuli_amount;
                        const gstForItem = totalPrice * (selectedBill.gst_percentage || 0) / 100;
                        const totalWithGst = totalPrice + gstForItem;
                        
                        return (
                          <tr key={item.id} className="border-b border-black">
                            <td className="border-r border-black p-2 text-center">{index + 1}</td>
                            <td className="border-r border-black p-2">{item.category_name}</td>
                            <td className="border-r border-black p-2">-</td>
                            <td className="border-r border-black p-2 text-center">{item.weight.toFixed(3)}</td>
                            <td className="border-r border-black p-2 text-right">₹{selectedBill.gold_rate?.toFixed(2) || '0.00'}</td>
                            <td className="p-2 text-right">₹{totalWithGst.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="grid grid-cols-2 gap-4 p-3 text-sm border-t border-black">
                  <div>
                    <p className="font-semibold mb-1">Bank Details:</p>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-0.5">A/C No</td>
                          <td className="py-0.5">: 40836933733</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">Bank</td>
                          <td className="py-0.5">: State Bank of India</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">IFSC Code</td>
                          <td className="py-0.5">: SBIN0071235</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">Branch</td>
                          <td className="py-0.5">: Sankarankovil branch</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <table className="w-full">
                      <tbody>
                        <tr className="font-bold border-t-2 border-black">
                          <td className="py-1">NET PAYABLE</td>
                          <td className="py-1 text-right">₹{Number(selectedBill.grand_total).toFixed(2)}</td>
                        </tr>
                        <tr className="font-bold border-t-2 border-black">
                          <td className="py-1">CASH AMOUNT</td>
                          <td className="py-1 text-right">₹{Number(selectedBill.grand_total).toFixed(2)}</td>
                        </tr>
                        <tr className="font-semibold">
                          <td className="py-1">REMAINING AMOUNT</td>
                          <td className="py-1 text-right">₹0.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Terms and Signature */}
                <div className="grid grid-cols-2 gap-4 p-3 text-sm border-t border-black">
                  <div>
                    <p className="font-semibold mb-1">Terms and Conditions:</p>
                    <p className="text-xs leading-snug">
                      This invoice is applicable only for Gold, Diamond and Precious ornaments. 
                      In addition to the indication of separate description of each article, 
                      net weight of precious metal, purity in carat and fineness, gross weight 
                      in bill or invoice or sale of hallmarked precious metal articles.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold mb-8">For MGM JEWELLERS</p>
                    <p className="border-t border-black pt-1 inline-block px-4">Authorized Signatory</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-2 text-sm">
                <p className="italic text-gray-600">This is a computer generated invoice and needs no signature.</p>
                <p className="mt-1 text-xs text-gray-500">Powered by Techverse Infotech (8248329035)</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Printable Bill - Hidden, only shows when printing */}
      {selectedBill && billItems.length > 0 && (
        <PrintableBill
          customerName={selectedBill.customer_name}
          customerPhone=""
          customerAddress=""
          billItems={billItems.map(item => ({
            categoryName: item.category_name,
            subcategoryName: "",
            weight: item.weight,
            goldAmount: item.gold_amount,
            seikuliAmount: item.seikuli_amount,
            seikuliRate: item.seikuli_rate,
            gstApplicable: true,
          }))}
          oldOrnaments={[]}
          goldRate={selectedBill.gold_rate || 0}
          gstPercentage={selectedBill.gst_percentage || 0}
          subtotal={selectedBill.subtotal}
          gstAmount={selectedBill.gst_amount}
          grandTotal={selectedBill.grand_total}
          exchangeType="buy-ornaments"
          invoiceNumber={selectedBill.invoice_number}
          creditedAmount={0}
          remainingAmount={selectedBill.grand_total}
        />
      )}

      {/* Old Exchange Details Dialog */}
      <Dialog open={isExchangeDialogOpen} onOpenChange={setIsExchangeDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="flex items-center justify-between">
              <span>Exchange Details</span>
              <Button onClick={handlePrintBill} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Bill
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedExchange ? (
            <div className="p-4 bg-white text-black">
              {/* Invoice Header */}
              <div className="border-2 border-black">
                <div className="text-center py-3 border-b border-black">
                  <img src="/lovable-uploads/mgm-logo.jpg" alt="MGM Jewellers Logo" className="h-16 mx-auto mb-1" 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <p className="text-sm">Ph: 9842112416 | +91 96885 01717</p>
                </div>
                
                <div className="text-center py-2 border-b border-black">
                  <p className="text-base font-bold">OLD GOLD EXCHANGE</p>
                </div>

                {/* Company and Invoice Details */}
                <div className="grid grid-cols-2 gap-4 p-3 text-sm border-b border-black">
                  <div>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="font-semibold py-0.5">Shop Name</td>
                          <td className="py-0.5">: MGM JEWELLERS</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-0.5 align-top">Address</td>
                          <td className="py-0.5">: 326/1 Rajapalayam Main Road,<br />Sankarankovil-627756</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="font-semibold py-0.5">SI No of Invoice</td>
                          <td className="py-0.5">: {selectedExchange.invoice_number || '-'}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-0.5">Date of Invoice</td>
                          <td className="py-0.5">: {format(new Date(selectedExchange.created_at), "dd/MM/yyyy")}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-0.5">Exchange Type</td>
                          <td className="py-0.5 capitalize">: {selectedExchange.exchange_type}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="p-3 text-sm border-b border-black">
                  <p className="font-bold mb-1">Details of Customer</p>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="font-semibold py-0.5">Name</td>
                        <td className="py-0.5">: {selectedExchange.customer_name}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-black bg-gray-100">
                        <th className="border-r border-black p-2 text-center">S.NO</th>
                        <th className="border-r border-black p-2 text-left">Category</th>
                        <th className="border-r border-black p-2 text-left">Subcategory</th>
                        <th className="border-r border-black p-2 text-center">Initial Weight</th>
                        <th className="border-r border-black p-2 text-center">Final Weight</th>
                        <th className="border-r border-black p-2 text-right">Rate per gram</th>
                        <th className="p-2 text-right">Exchange Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 text-center">1</td>
                        <td className="border-r border-black p-2">{selectedExchange.category_name}</td>
                        <td className="border-r border-black p-2">{selectedExchange.subcategory_name || '-'}</td>
                        <td className="border-r border-black p-2 text-center">{selectedExchange.initial_weight.toFixed(3)}g</td>
                        <td className="border-r border-black p-2 text-center">{selectedExchange.final_weight.toFixed(3)}g</td>
                        <td className="border-r border-black p-2 text-right">₹{selectedExchange.metal_rate.toFixed(2)}</td>
                        <td className="p-2 text-right font-semibold">₹{selectedExchange.exchange_value.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="grid grid-cols-2 gap-4 p-3 text-sm border-t border-black">
                  <div>
                    <p className="font-semibold mb-1">Bank Details:</p>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-0.5">A/C No</td>
                          <td className="py-0.5">: 40836933733</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">Bank</td>
                          <td className="py-0.5">: State Bank of India</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">IFSC Code</td>
                          <td className="py-0.5">: SBIN0071235</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">Branch</td>
                          <td className="py-0.5">: Sankarankovil branch</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <table className="w-full">
                      <tbody>
                        <tr className="font-bold border-t-2 border-black">
                          <td className="py-1">CASH AMOUNT</td>
                          <td className="py-1 text-right">₹{Number(selectedExchange.exchange_value).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Terms and Signature */}
                <div className="grid grid-cols-2 gap-4 p-3 text-sm border-t border-black">
                  <div>
                    <p className="font-semibold mb-1">Terms and Conditions:</p>
                    <p className="text-xs leading-snug">
                      This invoice is applicable only for Gold, Diamond and Precious ornaments. 
                      In addition to the indication of separate description of each article, 
                      net weight of precious metal, purity in carat and fineness, gross weight 
                      in bill or invoice or sale of hallmarked precious metal articles.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold mb-8">For MGM JEWELLERS</p>
                    <p className="border-t border-black pt-1 inline-block px-4">Authorized Signatory</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-2 text-sm">
                <p className="italic text-gray-600">This is a computer generated invoice and needs no signature.</p>
                <p className="mt-1 text-xs text-gray-500">Powered by Techverse Infotech (8248329035)</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Printable Exchange Bill - Hidden, only shows when printing */}
      {selectedExchange && (
        <PrintableBill
          customerName={selectedExchange.customer_name}
          customerPhone=""
          customerAddress=""
          billItems={[]}
          oldOrnaments={[{
            categoryName: selectedExchange.category_name,
            subcategoryName: selectedExchange.subcategory_name || "",
            initialWeight: selectedExchange.initial_weight,
            finalWeight: selectedExchange.final_weight,
            ratePerGram: selectedExchange.metal_rate,
            value: selectedExchange.exchange_value,
          }]}
          goldRate={0}
          gstPercentage={0}
          subtotal={0}
          gstAmount={0}
          grandTotal={0}
          exchangeType={selectedExchange.exchange_type}
          invoiceNumber={selectedExchange.invoice_number}
          creditedAmount={0}
          remainingAmount={0}
        />
      )}
    </SidebarProvider>
  );
};

export default BillHistory;
