import { format } from "date-fns";
import mgmLogo from "@/assets/mgm-logo.jpg";

interface PrintableBillProps {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGstPan?: string;
  billItems: Array<{
    categoryName: string;
    subcategoryName: string;
    weight: number;
    goldAmount: number;
    seikuliAmount: number;
    seikuliRate: number;
    gstApplicable: boolean;
  }>;
  oldOrnaments: Array<{
    categoryName: string;
    subcategoryName: string;
    initialWeight: number;
    finalWeight: number;
    ratePerGram: number;
    value: number;
  }>;
  goldRate: number;
  silverRate?: number;
  gstPercentage: number;
  subtotal: number;
  gstAmount: number;
  discountAmount?: number;
  grandTotal: number;
  exchangeType: string;
  invoiceNumber?: string;
  creditedAmount?: number;
  remainingAmount?: number;
}

export const PrintableBill = ({
  customerName,
  customerPhone,
  customerAddress,
  customerGstPan,
  billItems,
  oldOrnaments,
  goldRate,
  silverRate,
  gstPercentage,
  subtotal,
  gstAmount,
  discountAmount = 0,
  grandTotal,
  exchangeType,
  invoiceNumber,
  creditedAmount = 0,
  remainingAmount = 0,
}: PrintableBillProps) => {
  const totalOldOrnamentValue = oldOrnaments.reduce((sum, item) => sum + item.value, 0);
  const cgstAmount = gstAmount / 2;
  const sgstAmount = gstAmount / 2;
  
  // Check if GST is applicable
  const hasGst = gstAmount > 0;
  
  // Determine metal type for header
  const hasGold = billItems.some(item => item.categoryName.toLowerCase().includes('gold'));
  const hasSilver = billItems.some(item => item.categoryName.toLowerCase().includes('silver'));
  const metalPriceHeader = hasGold && !hasSilver ? "Gold Price" : 
                           hasSilver && !hasGold ? "Silver Price" : 
                           "Metal Price";
  
  return (
    <div className="printable-bill hidden print:block print:w-full print:max-w-[210mm] print:mx-auto print:bg-white print:text-black print:p-2 font-sans">
      {/* Header Section */}
      <div className="border-2 border-black mb-0.5">
        <div className="text-center py-2 border-b border-black">
          <img src={mgmLogo} alt="MGM Jewellers Logo" className="h-16 mx-auto mb-1" />
          <p className="text-sm">
            Ph: 9842112416 | +91 96885 01717
          </p>
        </div>
        
        <div className="text-center py-1 border-b border-black">
          <p className="text-base font-bold">SALE INVOICE</p>
        </div>

        {/* Company and Invoice Details */}
        <div className="grid grid-cols-2 gap-2 p-1.5 text-sm border-b border-black">
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
                {hasGst && (
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
                  <td className="py-0.5">: {invoiceNumber || `MGM_${format(new Date(), "yyyyMMddHHmmss")}`}</td>
                </tr>
                <tr>
                  <td className="font-semibold py-0.5">Date of Invoice</td>
                  <td className="py-0.5">: {format(new Date(), "dd/MM/yyyy")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Receiver Details */}
        <div className="p-1.5 text-sm border-b border-black">
          <p className="font-bold mb-0.5">Details of Receiver (Billed to)</p>
          <table className="w-full">
            <tbody>
              <tr>
                <td className="font-semibold py-0.5">Name</td>
                <td className="py-0.5">: {customerName}</td>
              </tr>
              <tr>
                <td className="font-semibold py-0.5">Address</td>
                <td className="py-0.5">: {customerAddress || "Sankarankovil"}</td>
              </tr>
              <tr>
                <td className="font-semibold py-0.5">Phone</td>
                <td className="py-0.5">: {customerPhone || "-"}</td>
              </tr>
              {customerGstPan && (
                <tr>
                  <td className="font-semibold py-0.5">GSTNO/PAN NO</td>
                  <td className="py-0.5">: {customerGstPan}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-black">
                <th className="border-r border-black p-0.5 text-center">S.NO</th>
                <th className="border-r border-black p-0.5 text-left">Category</th>
                <th className="border-r border-black p-0.5 text-left">Subcategory</th>
                <th className="border-r border-black p-0.5 text-center">Weight (grams)</th>
                {exchangeType === "buy-ornaments" && (
                  <>
                    <th className="border-r border-black p-0.5 text-right">Today's Gold/Silver Price</th>
                    <th className="border-r border-black p-0.5 text-right">{metalPriceHeader}</th>
                    {hasGst && (
                      <th className="border-r border-black p-0.5 text-right">GST ({gstPercentage}%)</th>
                    )}
                  </>
                )}
                <th className="border-r border-black p-0.5 text-right">Rate per gram</th>
                <th className="p-0.5 text-right">Total Price</th>
              </tr>
            </thead>
            <tbody>
              {billItems.map((item, index) => {
                const isGold = item.categoryName.toLowerCase().includes('gold');
                const metalRate = isGold ? goldRate : (silverRate || goldRate);
                const goldPrice = item.goldAmount + item.seikuliAmount;
                const gstAmountForItem = item.gstApplicable ? (goldPrice * gstPercentage) / 100 : 0;
                const totalPriceWithGst = goldPrice + gstAmountForItem;
                
                return (
                  <tr key={index} className="border-b border-black">
                    <td className="border-r border-black p-0.5 text-center">{index + 1}</td>
                    <td className="border-r border-black p-0.5">{item.categoryName}</td>
                    <td className="border-r border-black p-0.5">{item.subcategoryName}</td>
                    <td className="border-r border-black p-0.5 text-center">{item.weight.toFixed(3)}</td>
                    {exchangeType === "buy-ornaments" && (
                      <>
                        <td className="border-r border-black p-0.5 text-right">₹{metalRate.toFixed(2)}</td>
                        <td className="border-r border-black p-0.5 text-right">₹{goldPrice.toFixed(2)}</td>
                        {hasGst && (
                          <td className="border-r border-black p-0.5 text-right">
                            {item.gstApplicable ? `₹${gstAmountForItem.toFixed(2)}` : '-'}
                          </td>
                        )}
                      </>
                    )}
                    <td className="border-r border-black p-0.5 text-right">₹{metalRate.toFixed(2)}</td>
                    <td className="p-0.5 text-right">₹{totalPriceWithGst.toFixed(2)}</td>
                  </tr>
                );
              })}
              
              {oldOrnaments.map((item, index) => {
                return (
                  <tr key={`old-${index}`} className="border-b border-black">
                    <td className="border-r border-black p-0.5 text-center">{billItems.length + index + 1}</td>
                    <td className="border-r border-black p-0.5 text-orange-700">
                      {item.categoryName} (Exchange)
                    </td>
                    <td className="border-r border-black p-0.5 text-orange-700">
                      {item.subcategoryName}
                    </td>
                    <td className="border-r border-black p-0.5 text-center text-orange-700">{item.finalWeight.toFixed(3)}</td>
                    {exchangeType === "buy-ornaments" && (
                      <>
                        <td className="border-r border-black p-0.5 text-right text-orange-700">₹{item.ratePerGram.toFixed(2)}</td>
                        <td className="border-r border-black p-0.5 text-right text-orange-700">-₹{item.value.toFixed(2)}</td>
                        {hasGst && (
                          <td className="border-r border-black p-0.5 text-right text-orange-700">-</td>
                        )}
                      </>
                    )}
                    <td className="border-r border-black p-0.5 text-right text-orange-700">₹{item.ratePerGram.toFixed(2)}</td>
                    <td className="p-0.5 text-right text-orange-700">-₹{item.value.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="grid grid-cols-2 gap-2 p-1.5 text-sm border-t border-black">
          <div>
            <p className="font-semibold mb-0.5">Bank Details:</p>
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
              {discountAmount > 0 && (
                <tr>
                  <td className="py-0.5">Discount</td>
                  <td className="py-0.5 text-right text-destructive">-₹{discountAmount.toFixed(2)}</td>
                </tr>
              )}
              <tr className="font-bold border-t-2 border-black">
                  <td className="py-0.5">NET PAYABLE</td>
                  <td className="py-0.5 text-right">₹{grandTotal.toFixed(2)}</td>
                </tr>
                <tr className="font-bold border-t-2 border-black">
                  <td className="py-0.5">CASH AMOUNT</td>
                  <td className="py-0.5 text-right">₹{creditedAmount.toFixed(2)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-0.5">REMAINING AMOUNT</td>
                  <td className="py-0.5 text-right">₹{remainingAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms and Signature */}
        <div className="grid grid-cols-2 gap-2 p-1.5 text-sm border-t border-black">
          <div>
            <p className="font-semibold mb-0.5">Terms and Conditions:</p>
            <p className="text-xs leading-snug">
              This invoice is applicable only for Gold, Diamond and Precious ornaments. 
              In addition to the indication of separate description of each article, 
              net weight of precious metal, purity in carat and fineness, gross weight 
              in bill or invoice or sale of hallmarked precious metal articles.
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold mb-4">For MGM JEWELLERS</p>
            <p className="mt-4 border-t border-black pt-0.5 inline-block px-3">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-0.5 text-sm">
        <p className="italic">This is a computer generated invoice and needs no signature.</p>
        <p className="mt-0.5 text-xs">Powered by Techverse Infotech (8248329035)</p>
      </div>
    </div>
  );
};
