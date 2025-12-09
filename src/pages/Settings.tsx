import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
const Settings = () => {
  const [goldRate, setGoldRate] = useState("");
  const [silverRate, setSilverRate] = useState("");
  const [gstRate, setGstRate] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  
  // Subcategory states
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [newSubcategory, setNewSubcategory] = useState("");
  const [newSubcategorySeikuli, setNewSubcategorySeikuli] = useState("");
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState("");
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState("");
  const [editSubcategorySeikuli, setEditSubcategorySeikuli] = useState("");
  const [editSubcategoryCategoryId, setEditSubcategoryCategoryId] = useState("");
  const [showDeleteSubDialog, setShowDeleteSubDialog] = useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchSettings();
    fetchCategories();
    fetchSubcategories();

    // Set up real-time subscriptions
    const settingsChannel = supabase.channel('settings-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'settings'
    }, () => {
      fetchSettings();
    }).subscribe();
    const categoriesChannel = supabase.channel('categories-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'categories'
    }, () => {
      fetchCategories();
    }).subscribe();
    const subcategoriesChannel = supabase.channel('subcategories-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'subcategories'
    }, () => {
      fetchSubcategories();
    }).subscribe();
    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(subcategoriesChannel);
    };
  }, []);
  const fetchSettings = async () => {
    const {
      data,
      error
    } = await supabase.from('settings').select('*').single();
    if (error) {
      console.error('Error fetching settings:', error);
    } else if (data) {
      setGoldRate(data.gold_rate.toString());
      setSilverRate((data as any).silver_rate?.toString() || "7000");
      setGstRate((data as any).gst_rate?.toString() || "3");
    }
    setLoading(false);
  };
  const fetchCategories = async () => {
    const {
      data: categoriesData,
      error: categoriesError
    } = await supabase.from('categories').select('*').order('name');
    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return;
    }
    setCategories(categoriesData || []);
  };

  const fetchSubcategories = async () => {
    const {
      data: subcategoriesData,
      error: subcategoriesError
    } = await supabase.from('subcategories').select('*').order('name');
    if (subcategoriesError) {
      console.error('Error fetching subcategories:', subcategoriesError);
      return;
    }
    setSubcategories(subcategoriesData || []);
  };
  const handleSaveRates = async () => {
    const {
      error
    } = await supabase.from('settings').update({
      gold_rate: parseFloat(goldRate),
      silver_rate: parseFloat(silverRate),
      gst_rate: parseFloat(gstRate)
    }).eq('id', (await supabase.from('settings').select('id').single()).data?.id);
    if (error) {
      toast.error("Failed to update rates");
    } else {
      toast.success("Rates have been saved successfully.");
    }
  };
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error("Please enter category name");
      return;
    }
    const {
      error
    } = await supabase.from('categories').insert({
      name: newCategory
    });
    if (error) {
      toast.error(error.message);
    } else {
      const addedCategoryName = newCategory;
      setNewCategory("");
      toast.success(`${addedCategoryName} has been added successfully.`);
    }
  };
  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete({
      id: category.id,
      name: category.name
    });
    setShowDeleteDialog(true);
  };
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const {
      error
    } = await supabase.from('categories').delete().eq('id', categoryToDelete.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${categoryToDelete.name} has been removed successfully.`);
    }
    setShowDeleteDialog(false);
    setCategoryToDelete(null);
  };
  const handleEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
  };
  const handleUpdateCategory = async (id: string) => {
    if (!editCategoryName.trim()) {
      toast.error("Please enter category name");
      return;
    }
    const {
      error
    } = await supabase.from('categories').update({
      name: editCategoryName
    }).eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      setEditingCategoryId(null);
      setEditCategoryName("");
      toast.success("Category has been updated successfully.");
    }
  };
  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditCategoryName("");
  };

  // Subcategory handlers
  const handleAddSubcategory = async () => {
    if (!newSubcategory.trim() || !selectedCategoryForSub) {
      toast.error("Please enter subcategory name and select a category");
      return;
    }
    const {
      error
    } = await supabase.from('subcategories').insert({
      name: newSubcategory,
      category_id: selectedCategoryForSub,
      seikuli_rate: newSubcategorySeikuli.trim() ? parseFloat(newSubcategorySeikuli) : null
    });
    if (error) {
      toast.error(error.message);
    } else {
      const addedSubcategoryName = newSubcategory;
      setNewSubcategory("");
      setNewSubcategorySeikuli("");
      setSelectedCategoryForSub("");
      toast.success(`${addedSubcategoryName} has been added successfully.`);
    }
  };

  const handleDeleteSubClick = (subcategory: Subcategory) => {
    setSubcategoryToDelete({
      id: subcategory.id,
      name: subcategory.name
    });
    setShowDeleteSubDialog(true);
  };

  const handleDeleteSubcategory = async () => {
    if (!subcategoryToDelete) return;
    const {
      error
    } = await supabase.from('subcategories').delete().eq('id', subcategoryToDelete.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${subcategoryToDelete.name} has been removed successfully.`);
    }
    setShowDeleteSubDialog(false);
    setSubcategoryToDelete(null);
  };

  const handleEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategoryId(subcategory.id);
    setEditSubcategoryName(subcategory.name);
    setEditSubcategoryCategoryId(subcategory.category_id);
    setEditSubcategorySeikuli(subcategory.seikuli_rate !== null ? subcategory.seikuli_rate.toString() : "");
  };

  const handleUpdateSubcategory = async (id: string) => {
    if (!editSubcategoryName.trim() || !editSubcategoryCategoryId) {
      toast.error("Please enter subcategory name and select a category");
      return;
    }
    const {
      error
    } = await supabase.from('subcategories').update({
      name: editSubcategoryName,
      category_id: editSubcategoryCategoryId,
      seikuli_rate: editSubcategorySeikuli.trim() ? parseFloat(editSubcategorySeikuli) : null
    }).eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      setEditingSubcategoryId(null);
      setEditSubcategoryName("");
      setEditSubcategoryCategoryId("");
      setEditSubcategorySeikuli("");
      toast.success("Subcategory has been updated successfully.");
    }
  };

  const handleCancelSubEdit = () => {
    setEditingSubcategoryId(null);
    setEditSubcategoryName("");
    setEditSubcategoryCategoryId("");
    setEditSubcategorySeikuli("");
  };
  return <SidebarProvider>
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
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-sm text-muted-foreground">Manage rates and categories</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 bg-gradient-to-br from-background via-accent/20 to-background">
            <div className="container mx-auto px-6 py-8 max-w-5xl">
              <div className="space-y-6">
                {/* Rates Section */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Daily Rates</CardTitle>
                    <CardDescription>Update metal rates per gram and GST percentage (Seikuli rates are set per category below)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="goldRate">Gold Rate (per gram)</Label>
                        <Input id="goldRate" type="number" placeholder="10000" value={goldRate} onChange={e => setGoldRate(e.target.value)} className="text-lg font-semibold" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="silverRate">Silver Rate (per gram)</Label>
                        <Input id="silverRate" type="number" placeholder="7000" value={silverRate} onChange={e => setSilverRate(e.target.value)} className="text-lg font-semibold" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gstRate">GST (%)</Label>
                        <Input id="gstRate" type="number" step="0.1" placeholder="3" value={gstRate} onChange={e => setGstRate(e.target.value)} className="text-lg font-semibold" />
                      </div>
                    </div>
                    <Button onClick={handleSaveRates} className="w-full md:w-auto">
                      Save Rates
                    </Button>
                  </CardContent>
                </Card>

                {/* Categories Section */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>Manage product categories</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Add Category */}
                    <div className="space-y-2">
                      <Label>Add New Category</Label>
                      <div className="flex gap-2">
                        <Input placeholder="Category name" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyPress={e => e.key === "Enter" && !e.shiftKey && handleAddCategory()} />
                        <Button onClick={handleAddCategory} className="gap-2 whitespace-nowrap">
                          <Plus className="h-4 w-4" />
                          Add Category
                        </Button>
                      </div>
                    </div>

                    {/* Display Categories */}
                    {categories.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No categories yet. Add your first category above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categories.map(category => (
                          <Card key={category.id} className="border hover:shadow-md transition-shadow">
                            <CardContent className="pt-4">
                              {editingCategoryId === category.id ? (
                                <div className="space-y-3">
                                  <Input 
                                    placeholder="Category name" 
                                    value={editCategoryName} 
                                    onChange={e => setEditCategoryName(e.target.value)}
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button onClick={() => handleUpdateCategory(category.id)} size="sm" className="flex-1">
                                      Save
                                    </Button>
                                    <Button onClick={handleCancelEdit} variant="outline" size="sm" className="flex-1">
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-lg">{category.name}</h3>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)} className="h-8 w-8">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(category)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Subcategories Section */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Subcategories</CardTitle>
                    <CardDescription>Manage subcategories with their seikuli rates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Add Subcategory */}
                    <div className="space-y-2">
                      <Label>Add New Subcategory</Label>
                      <div className="flex gap-2">
                        <Select value={selectedCategoryForSub} onValueChange={setSelectedCategoryForSub}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input placeholder="Subcategory name" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} onKeyPress={e => e.key === "Enter" && !e.shiftKey && handleAddSubcategory()} />
                        <Input placeholder="Seikuli rate (optional)" type="number" value={newSubcategorySeikuli} onChange={e => setNewSubcategorySeikuli(e.target.value)} onKeyPress={e => e.key === "Enter" && !e.shiftKey && handleAddSubcategory()} className="max-w-[150px]" />
                        <Button onClick={handleAddSubcategory} className="gap-2 whitespace-nowrap">
                          <Plus className="h-4 w-4" />
                          Add Subcategory
                        </Button>
                      </div>
                    </div>

                    {/* Display Subcategories grouped by category */}
                    <div className="space-y-4">
                      {categories.map(category => {
                        const categorySubcategories = subcategories.filter(sub => sub.category_id === category.id);
                        if (categorySubcategories.length === 0) return null;
                        
                        return (
                          <div key={category.id} className="space-y-2">
                            <h3 className="font-semibold text-sm text-muted-foreground">{category.name}</h3>
                            <div className="space-y-2">
                              {categorySubcategories.map(subcategory => (
                                <Card key={subcategory.id} className="border">
                                  <CardContent className="pt-3 pb-3">
                                    {editingSubcategoryId === subcategory.id ? (
                                      <div className="space-y-3">
                                        <div className="flex gap-2">
                                          <Select value={editSubcategoryCategoryId} onValueChange={setEditSubcategoryCategoryId}>
                                            <SelectTrigger className="w-[200px]">
                                              <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                  {cat.name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <Input placeholder="Subcategory name" value={editSubcategoryName} onChange={e => setEditSubcategoryName(e.target.value)} />
                                          <Input placeholder="Seikuli rate (optional)" type="number" value={editSubcategorySeikuli} onChange={e => setEditSubcategorySeikuli(e.target.value)} className="max-w-[150px]" />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button onClick={() => handleUpdateSubcategory(subcategory.id)} size="sm">
                                            Save
                                          </Button>
                                          <Button onClick={handleCancelSubEdit} variant="outline" size="sm">
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <span className="font-semibold">{subcategory.name}</span>
                                          <p className="text-sm text-muted-foreground">
                                            Seikuli Rate: {subcategory.seikuli_rate !== null ? `₹${subcategory.seikuli_rate}/gram` : 'Not set'}
                                          </p>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button variant="ghost" size="icon" onClick={() => handleEditSubcategory(subcategory)}>
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSubClick(subcategory)} className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
          
          <Footer />
        </div>
      </div>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{categoryToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-600 hover:bg-red-700 text-gray-50">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subcategory Confirmation Dialog */}
      <AlertDialog open={showDeleteSubDialog} onOpenChange={setShowDeleteSubDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this subcategory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{subcategoryToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubcategory} className="bg-red-600 hover:bg-red-700 text-gray-50">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>;
};
export default Settings;