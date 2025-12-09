import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Printer, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrintableBill } from "@/components/PrintableBill";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface BillItem {
  id: string;
  categoryId: string;
  subcategoryId: string;
  subcategoryName: string;
  categoryName: string;
  weight: number;
  goldAmount: number;
  seikuliAmount: number;
  seikuliRate: number;
  total: number;
  gstApplicable: boolean;
}

interface OldOrnamentItem {
  id: string;
  categoryId: string;
  subcategoryId: string;
  subcategoryName: string;
  categoryName: string;
  initialWeight: number;
  finalWeight: number;
  ratePerGram: number;
  value: number;
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  seikuli_rate: number;
}

const OldGoldExchange = () => {
  const [goldRate, setGoldRate] = useState(0);
  const [silverRate, setSilverRate] = useState(0);
  const [gstPercentage, setGstPercentage] = useState(3);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGstPan, setCustomerGstPan] = useState("");
  const [creditedAmount, setCreditedAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("buy-ornaments");
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [oldOrnaments, setOldOrnaments] = useState<OldOrnamentItem[]>([]);
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState<string>("");
  const [currentItem, setCurrentItem] = useState({
    categoryId: "",
    subcategoryId: "",
    weight: "",
    gstApplicable: true
  });
  const [currentOldOrnament, setCurrentOldOrnament] = useState({
    categoryId: "",
    subcategoryId: "",
    initialWeight: "",
    finalWeight: "",
    ratePerGram: ""
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingOldOrnamentId, setEditingOldOrnamentId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    // Real-time subscriptions
    const settingsChannel = supabase
      .channel('old-gold-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchSettings();
      })
      .subscribe();

    const categoriesChannel = supabase
      .channel('old-gold-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCategories();
      })
      .subscribe();

    const subcategoriesChannel = supabase
      .channel('old-gold-subcategories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategories' }, () => {
        fetchSubcategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(subcategoriesChannel);
    };
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchSettings(), fetchCategories(), fetchSubcategories()]);
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) {
      setGoldRate(Number(data.gold_rate));
      setSilverRate(Number((data as any).silver_rate) || 7000);
      setGstPercentage(Number((data as any).gst_rate) || 3);
    }
  };

  const fetchCategories = async () => {
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (categoriesData) {
      setCategories(categoriesData);
    }
  };

  const fetchSubcategories = async () => {
    const { data: subcategoriesData } = await supabase
      .from('subcategories')
      .select('*')
      .order('name');
    if (subcategoriesData) {
      setSubcategories(subcategoriesData);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.subcategoryId || !currentItem.weight) {
      toast.error("Please fill all item details");
      return;
    }

    const subcategory = subcategories.find((s) => s.id === currentItem.subcategoryId);
    if (!subcategory) return;

    const category = categories.find((c) => c.id === subcategory.category_id);
    if (!category) return;

    const weight = parseFloat(currentItem.weight);
    const isOthers = category.name.toLowerCase() === 'others';
    const isSilver = category.name.toLowerCase().includes('silver');
    const metalRate = isOthers ? silverRate + 10 : isSilver ? silverRate : goldRate;
    const goldAmount = weight * metalRate;

    const hasSeikuli = subcategory.seikuli_rate !== null && subcategory.seikuli_rate !== undefined;
    const seikuliRate = hasSeikuli ? Number(subcategory.seikuli_rate) : 0;
    const seikuliAmount = hasSeikuli ? weight * seikuliRate : 0;
    const total = goldAmount + seikuliAmount;

    if (editingItemId) {
      const updatedItems = billItems.map((item) =>
        item.id === editingItemId
          ? {
              id: item.id,
              categoryId: category.id,
              subcategoryId: subcategory.id,
              subcategoryName: subcategory.name,
              categoryName: category.name,
              weight,
              goldAmount,
              seikuliAmount,
              seikuliRate: seikuliRate,
              total,
              gstApplicable: currentItem.gstApplicable,
            }
          : item
      );
      setBillItems(updatedItems);
      setEditingItemId(null);
      toast.success("Item has been updated successfully");
    } else {
      const newItem: BillItem = {
        id: Date.now().toString(),
        categoryId: category.id,
        subcategoryId: subcategory.id,
        subcategoryName: subcategory.name,
        categoryName: category.name,
        weight,
        goldAmount,
        seikuliAmount,
        seikuliRate: seikuliRate,
        total,
        gstApplicable: currentItem.gstApplicable,
      };
      setBillItems([...billItems, newItem]);
      toast.success("Item has been added to the bill");
    }

    setCurrentItem({
      categoryId: "",
      subcategoryId: "",
      weight: "",
      gstApplicable: true,
    });
  };

  const handleEditItem = (id: string) => {
    const itemToEdit = billItems.find((item) => item.id === id);
    if (itemToEdit) {
      const subcategory = subcategories.find((s) => s.id === itemToEdit.subcategoryId);
      setCurrentItem({
        categoryId: subcategory?.category_id || "",
        subcategoryId: itemToEdit.subcategoryId,
        weight: itemToEdit.weight.toString(),
        gstApplicable: itemToEdit.gstApplicable,
      });
      setEditingItemId(id);
      toast("Modify the item details below", { icon: "✏️" });
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setCurrentItem({
      categoryId: "",
      subcategoryId: "",
      weight: "",
      gstApplicable: true,
    });
  };

  const handleDeleteItem = (id: string) => {
    setBillItems(billItems.filter((item) => item.id !== id));
  };

  const handleAddOldOrnament = () => {
    if (!currentOldOrnament.categoryId || !currentOldOrnament.subcategoryId || !currentOldOrnament.initialWeight || !currentOldOrnament.finalWeight || !currentOldOrnament.ratePerGram) {
      toast.error("Please fill all old ornament details");
      return;
    }

    const subcategory = subcategories.find((s) => s.id === currentOldOrnament.subcategoryId);
    if (!subcategory) return;

    const category = categories.find((c) => c.id === subcategory.category_id);
    if (!category) return;

    const initialWeight = parseFloat(currentOldOrnament.initialWeight);
    const finalWeight = parseFloat(currentOldOrnament.finalWeight);
    const ratePerGram = parseFloat(currentOldOrnament.ratePerGram);
    const value = finalWeight * ratePerGram;

    if (editingOldOrnamentId) {
      const updatedOldOrnaments = oldOrnaments.map((item) =>
        item.id === editingOldOrnamentId
          ? {
              id: item.id,
              categoryId: category.id,
              subcategoryId: subcategory.id,
              subcategoryName: subcategory.name,
              categoryName: category.name,
              initialWeight,
              finalWeight,
              ratePerGram,
              value,
            }
          : item
      );
      setOldOrnaments(updatedOldOrnaments);
      setEditingOldOrnamentId(null);
      toast.success("Old ornament updated successfully");
    } else {
      const newOldOrnament: OldOrnamentItem = {
        id: Date.now().toString(),
        categoryId: category.id,
        subcategoryId: subcategory.id,
        subcategoryName: subcategory.name,
        categoryName: category.name,
        initialWeight,
        finalWeight,
        ratePerGram,
        value,
      };
      setOldOrnaments([...oldOrnaments, newOldOrnament]);
      toast.success("Old ornament added");
    }

    setCurrentOldOrnament({
      categoryId: "",
      subcategoryId: "",
      initialWeight: "",
      finalWeight: "",
      ratePerGram: ""
    });
  };

  const handleEditOldOrnament = (id: string) => {
    const ornamentToEdit = oldOrnaments.find((item) => item.id === id);
    if (ornamentToEdit) {
      const subcategory = subcategories.find((s) => s.id === ornamentToEdit.subcategoryId);
      setCurrentOldOrnament({
        categoryId: subcategory?.category_id || "",
        subcategoryId: ornamentToEdit.subcategoryId,
        initialWeight: ornamentToEdit.initialWeight.toString(),
        finalWeight: ornamentToEdit.finalWeight.toString(),
        ratePerGram: ornamentToEdit.ratePerGram.toString()
      });
      setEditingOldOrnamentId(id);
      toast("Modify the old ornament details below", { icon: "✏️" });
    }
  };

  const handleCancelOldOrnamentEdit = () => {
    setEditingOldOrnamentId(null);
    setCurrentOldOrnament({
      categoryId: "",
      subcategoryId: "",
      initialWeight: "",
      finalWeight: "",
      ratePerGram: ""
    });
  };

  const handleDeleteOldOrnament = (id: string) => {
    setOldOrnaments(oldOrnaments.filter((item) => item.id !== id));
    toast.success("Old ornament removed");
  };

  const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
  const gstApplicableTotal = billItems
    .filter((item) => item.gstApplicable)
    .reduce((sum, item) => sum + item.total, 0);
  const gstAmount = (gstApplicableTotal * gstPercentage) / 100;
  
  const totalOldOrnamentValue = oldOrnaments.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate discount
  const discountValue = parseFloat(discountAmount) || 0;
  
  // If buying ornaments, deduct old ornament value and discount from total. If cash, no items are added
  const grandTotal = activeTab === "buy-ornaments" 
    ? subtotal + gstAmount - totalOldOrnamentValue - discountValue
    : 0;

  // Calculate remaining amount
  const creditedAmountValue = parseFloat(creditedAmount) || 0;
  const remainingAmount = activeTab === "buy-ornaments" 
    ? grandTotal - creditedAmountValue
    : totalOldOrnamentValue - creditedAmountValue;

  const handlePrintBill = async () => {
    if (!customerName) {
      toast.error("Please add customer name");
      return;
    }

    if (oldOrnaments.length === 0) {
      toast.error("Please add at least one old ornament");
      return;
    }

    if (activeTab === "buy-ornaments" && billItems.length === 0) {
      toast.error("Please add at least one item to buy");
      return;
    }

    try {
      let billId = null;
      let invoiceNumber = "";

      // ALWAYS generate invoice number for all transactions
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings' as any)
        .select('id, last_invoice_number')
        .single();
      
      if (settingsError) throw settingsError;

      const nextInvoiceNumber = ((settingsData as any).last_invoice_number || 0) + 1;
      invoiceNumber = `MGM_${nextInvoiceNumber}`;

      // Set the invoice number for display
      setCurrentInvoiceNumber(invoiceNumber);

      // Update last invoice number in settings
      const { error: updateError } = await supabase
        .from('settings' as any)
        .update({ last_invoice_number: nextInvoiceNumber })
        .eq('id', (settingsData as any).id);

      if (updateError) throw updateError;

      // Save bill only if buying ornaments
      if (activeTab === "buy-ornaments" && billItems.length > 0) {
        const { data: billData, error: billError } = await supabase
          .from('bills')
          .insert({
            customer_name: customerName,
            bill_date: new Date().toISOString(),
            gold_rate: goldRate,
            gst_percentage: gstPercentage,
            subtotal: subtotal,
            gst_amount: gstAmount,
            grand_total: grandTotal,
            invoice_number: invoiceNumber,
          })
          .select()
          .single();

        if (billError || !billData) throw billError || new Error('No data returned');
        billId = billData.id;

        // Save bill items
        const itemsToInsert = billItems.map((item) => ({
          bill_id: billData.id,
          category_id: item.categoryId,
          category_name: item.subcategoryName,
          weight: item.weight,
          gold_amount: item.goldAmount,
          seikuli_amount: item.seikuliAmount,
          seikuli_rate: item.seikuliRate,
          total: item.total,
        }));

        const { error: itemsError } = await supabase.from('bill_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      // Save all old exchange records
      const exchangesToInsert = oldOrnaments.map((ornament) => ({
        customer_name: customerName,
        category_id: ornament.categoryId,
        category_name: ornament.categoryName,
        subcategory_id: ornament.subcategoryId,
        subcategory_name: ornament.subcategoryName,
        initial_weight: ornament.initialWeight,
        final_weight: ornament.finalWeight,
        metal_rate: ornament.ratePerGram,
        exchange_value: ornament.value,
        exchange_type: activeTab === "buy-ornaments" ? "ornaments" : "cash",
        bill_id: billId,
      }));

      const { error: exchangeError } = await supabase
        .from('old_exchanges')
        .insert(exchangesToInsert);

      if (exchangeError) throw exchangeError;

      toast.success(`Bill for ${customerName} has been saved`);

      setTimeout(() => {
        window.print();
      }, 500);

      setTimeout(() => {
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setCustomerGstPan("");
        setCreditedAmount("");
        setDiscountAmount("");
        setBillItems([]);
        setOldOrnaments([]);
        setCurrentInvoiceNumber("");
      }, 1500);
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error("Failed to save bill. Please try again.");
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-[27px] py-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-2xl font-bold">Old Exchange</h1>
                    <p className="text-sm text-muted-foreground">Create bill with old ornament exchange</p>
                  </div>
                </div>
                <div className="flex gap-6 items-start">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Gold Rate</p>
                    <p className="text-2xl font-bold text-primary">₹{goldRate.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">per gram</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Silver Rate</p>
                    <p className="text-2xl font-bold text-primary">₹{silverRate.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">per gram</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 bg-gradient-to-br from-background via-accent/20 to-background">
            <div className="container mx-auto px-4 py-4 max-w-7xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column - Add Items */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Customer Info */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="customerName" className="text-sm">Customer Name</Label>
                          <Input
                            id="customerName"
                            placeholder="Enter customer name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="customerPhone" className="text-sm">Phone Number</Label>
                          <Input
                            id="customerPhone"
                            placeholder="Enter phone number"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="customerAddress" className="text-sm">Address</Label>
                          <Input
                            id="customerAddress"
                            placeholder="Enter address"
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="customerGstPan" className="text-sm">GSTNO/PAN NO (Optional)</Label>
                          <Input
                            id="customerGstPan"
                            placeholder="Enter GST or PAN number"
                            value={customerGstPan}
                            onChange={(e) => setCustomerGstPan(e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Old Ornament Exchange Details */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        {editingOldOrnamentId ? "Edit Old Ornament" : "Add Old Ornament Exchange"}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Enter old ornament details with subcategory
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="oldCategory" className="text-sm">Category</Label>
                            <Select
                              value={currentOldOrnament.categoryId}
                              onValueChange={(value) => {
                                setCurrentOldOrnament({
                                  ...currentOldOrnament,
                                  categoryId: value,
                                  subcategoryId: "",
                                });
                              }}
                            >
                              <SelectTrigger id="oldCategory" className="h-9">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="oldSubcategory" className="text-sm">Subcategory</Label>
                            <Select
                              value={currentOldOrnament.subcategoryId}
                              onValueChange={(value) =>
                                setCurrentOldOrnament({ ...currentOldOrnament, subcategoryId: value })
                              }
                              disabled={!currentOldOrnament.categoryId}
                            >
                              <SelectTrigger id="oldSubcategory" className="h-9">
                                <SelectValue placeholder="Select subcategory" />
                              </SelectTrigger>
                              <SelectContent>
                                {subcategories
                                  .filter((sub) => sub.category_id === currentOldOrnament.categoryId)
                                  .map((sub) => (
                                    <SelectItem key={sub.id} value={sub.id}>
                                      {sub.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="initialWeight" className="text-sm">Initial Weight (grams)</Label>
                            <Input
                              id="initialWeight"
                              type="number"
                              step="0.01"
                              placeholder="Enter initial weight"
                              value={currentOldOrnament.initialWeight}
                              onChange={(e) => setCurrentOldOrnament({ ...currentOldOrnament, initialWeight: e.target.value })}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="finalWeight" className="text-sm">Final Weight (grams)</Label>
                            <Input
                              id="finalWeight"
                              type="number"
                              step="0.01"
                              placeholder="Enter final weight"
                              value={currentOldOrnament.finalWeight}
                              onChange={(e) => setCurrentOldOrnament({ ...currentOldOrnament, finalWeight: e.target.value })}
                              className="h-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="ratePerGram" className="text-sm">Rate Per Gram (₹)</Label>
                          <Input
                            id="ratePerGram"
                            type="number"
                            step="0.01"
                            placeholder="Enter rate per gram"
                            value={currentOldOrnament.ratePerGram}
                            onChange={(e) => setCurrentOldOrnament({ ...currentOldOrnament, ratePerGram: e.target.value })}
                            className="h-9"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleAddOldOrnament} className="flex-1 gap-2 h-9">
                            {editingOldOrnamentId ? (
                              <>
                                <Pencil className="h-4 w-4" />
                                Update Ornament
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                Add Old Ornament
                              </>
                            )}
                          </Button>
                          {editingOldOrnamentId && (
                            <Button onClick={handleCancelOldOrnamentEdit} variant="outline" className="px-6 h-9">
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Old Ornaments List */}
                  {oldOrnaments.length > 0 && (
                    <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Old Ornaments ({oldOrnaments.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {oldOrnaments.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-base">
                                  {item.categoryName} - {item.subcategoryName} <span className="text-orange-600 dark:text-orange-400">(Exchange)</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Initial: {item.initialWeight}g • Final: {item.finalWeight}g • Rate: ₹{item.ratePerGram}/g
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-3">
                                <div className="text-right mr-2">
                                  <div className="font-bold text-base text-orange-600 dark:text-orange-400">₹{item.value.toLocaleString()}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditOldOrnament(item.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteOldOrnament(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Add Item Form with Tabs */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        {editingItemId ? "Edit Item" : "Choose Exchange Type"}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Select whether customer gets cash or buys new ornaments
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4">
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="get-cash">Get Cash</TabsTrigger>
                          <TabsTrigger value="buy-ornaments">Buy Ornaments</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="get-cash" className="space-y-3 mt-4">
                          <div className="p-4 bg-muted/50 rounded-lg text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                              Customer will receive cash for old ornament
                            </p>
                            {totalOldOrnamentValue > 0 && (
                              <p className="text-2xl font-bold text-primary">
                                ₹{totalOldOrnamentValue.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="creditedAmountCash" className="text-sm">Credited Amount (Cash Paid)</Label>
                              <Input
                                id="creditedAmountCash"
                                type="number"
                                step="0.01"
                                placeholder="Enter credited amount"
                                value={creditedAmount}
                                onChange={(e) => setCreditedAmount(e.target.value)}
                                className="h-9"
                              />
                            </div>
                            {creditedAmount && (
                              <div className="p-3 bg-muted rounded-lg">
                                <div className="flex justify-between text-sm">
                                  <span>Total Old Ornament Value:</span>
                                  <span className="font-semibold">₹{totalOldOrnamentValue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                  <span>Credited Amount:</span>
                                  <span className="font-semibold">₹{creditedAmountValue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t">
                                  <span>Remaining Amount:</span>
                                  <span className="text-primary">₹{remainingAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="buy-ornaments" className="space-y-3 mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="category" className="text-sm">Category</Label>
                              <Select
                                value={currentItem.categoryId}
                                onValueChange={(value) => {
                                  setCurrentItem({
                                    ...currentItem,
                                    categoryId: value,
                                    subcategoryId: "",
                                  });
                                }}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="subcategory" className="text-sm">Subcategory</Label>
                              <Select
                                value={currentItem.subcategoryId}
                                onValueChange={(value) =>
                                  setCurrentItem({ ...currentItem, subcategoryId: value })
                                }
                                disabled={!currentItem.categoryId}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select subcategory" />
                                </SelectTrigger>
                                <SelectContent>
                                  {subcategories
                                    .filter((sub) => sub.category_id === currentItem.categoryId)
                                    .map((sub) => (
                                      <SelectItem key={sub.id} value={sub.id}>
                                        {sub.name}
                                        {sub.seikuli_rate !== null ? ` (₹${sub.seikuli_rate}/g)` : ''}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="weight" className="text-sm">Weight (grams)</Label>
                            <Input
                              id="weight"
                              type="number"
                              step="0.01"
                              placeholder="2.5"
                              value={currentItem.weight}
                              onChange={(e) =>
                                setCurrentItem({ ...currentItem, weight: e.target.value })
                              }
                              className="h-9"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="gst"
                              checked={currentItem.gstApplicable}
                              onCheckedChange={(checked) =>
                                setCurrentItem({ ...currentItem, gstApplicable: checked === true })
                              }
                            />
                            <Label htmlFor="gst" className="text-sm font-normal cursor-pointer">
                              Apply GST to this item
                            </Label>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="creditedAmountOrnaments" className="text-sm">Credited Amount (Cash Paid)</Label>
                            <Input
                              id="creditedAmountOrnaments"
                              type="number"
                              step="0.01"
                              placeholder="Enter credited amount"
                              value={creditedAmount}
                              onChange={(e) => setCreditedAmount(e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleAddItem} className="flex-1 gap-2 h-9">
                              {editingItemId ? (
                                <>
                                  <Pencil className="h-4 w-4" />
                                  Update Item
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  Add to Bill
                                </>
                              )}
                            </Button>
                            {editingItemId && (
                              <Button onClick={handleCancelEdit} variant="outline" className="px-6 h-9">
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Bill Items List */}
                  {billItems.length > 0 && activeTab === "buy-ornaments" && (
                    <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Bill Items ({billItems.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {billItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-base">
                                  {item.categoryName} - {item.subcategoryName}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {item.weight}g • {item.categoryName}: ₹{item.goldAmount.toLocaleString()}
                                  {item.seikuliRate > 0 && (
                                    <>
                                      {' '}• Seikuli (₹{item.seikuliRate}/g): ₹{item.seikuliAmount.toLocaleString()}
                                    </>
                                  )}
                                  {item.gstApplicable && ' • GST applicable'}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-3">
                                <div className="text-right mr-2">
                                  <div className="font-bold text-base">₹{item.total.toLocaleString()}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditItem(item.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Column - Bill Summary */}
                <div className="lg:col-span-1">
                  <Card className="border-0 shadow-lg sticky top-20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Bill Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4">
                      <div className="space-y-2 pb-3 border-b">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">GST ({gstPercentage}%)</span>
                          <span className="font-medium">₹{gstAmount.toLocaleString()}</span>
                        </div>
                        {totalOldOrnamentValue > 0 && activeTab === "buy-ornaments" && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Old Ornament Deduction</span>
                            <span className="font-medium text-destructive">-₹{totalOldOrnamentValue.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="space-y-1.5 pt-2">
                          <Label htmlFor="discountAmount" className="text-sm">Discount Amount</Label>
                          <Input
                            id="discountAmount"
                            type="number"
                            step="0.01"
                            placeholder="Enter discount amount"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                       <div className="flex justify-between items-center pt-2">
                        <span className="text-base font-semibold">
                          {activeTab === "get-cash" ? "Cash Amount" : "Grand Total"}
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          ₹{activeTab === "get-cash" ? totalOldOrnamentValue.toLocaleString() : grandTotal.toLocaleString()}
                        </span>
                      </div>
                      {creditedAmount && (
                        <div className="space-y-2 pt-3 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Credited Amount</span>
                            <span className="font-semibold text-green-600">₹{creditedAmountValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-base font-semibold">Remaining Amount</span>
                            <span className="text-xl font-bold text-orange-600">₹{remainingAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      <Button
                        onClick={handlePrintBill}
                        className="w-full gap-2 h-10"
                        disabled={!customerName || oldOrnaments.length === 0}
                      >
                        <Printer className="h-4 w-4" />
                        Generate Bill
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>

          <Footer />

          {/* Hidden Print Layout */}
          <div className="hidden print:block">
            <PrintableBill
              customerName={customerName}
              customerPhone={customerPhone}
              customerAddress={customerAddress}
              customerGstPan={customerGstPan}
              billItems={billItems}
              oldOrnaments={oldOrnaments}
              goldRate={goldRate}
              subtotal={subtotal}
              gstPercentage={gstPercentage}
              gstAmount={gstAmount}
              discountAmount={discountValue}
              grandTotal={grandTotal}
              exchangeType={activeTab}
              invoiceNumber={currentInvoiceNumber}
              creditedAmount={creditedAmountValue}
              remainingAmount={remainingAmount}
            />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default OldGoldExchange;
