import { useState } from "react";
import {
  MAX_CONTRACT_FILE_SIZE,
  createEmptyDealForm,
  createDefaultFilters,
  createContractVersion,
  getWholesaleRehabDetails,
} from "../crmConfig";
import { findDuplicateByAddress } from "../../../../utils/utils";

export function useDealForm({
  deals,
  currentUser,
  saveDeal,
  saveBuyer,
  fetchBuyers,
  saveContractVersion,
  setDeals,
  setFilters,
}) {
  const [form, setForm] = useState(createEmptyDealForm);
  const [tableLoading, setTableLoading] = useState(false);
  const [formError, setFormError] = useState("");

  function resetForm() {
    setForm(createEmptyDealForm());
    setFormError("");
  }

  function handleContractFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isSupportedType =
      file.type === "application/pdf" ||
      file.type === "application/vnd.oasis.opendocument.text" ||
      file.type === "application/vnd.oasis.opendocument.formula" ||
      file.type.startsWith("image/") ||
      /\.odt$/i.test(file.name) ||
      /\.odf$/i.test(file.name);

    if (!isSupportedType) {
      alert("Please choose a PDF, ODF/ODT, or image file for the contract.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_CONTRACT_FILE_SIZE) {
      alert("Contract file must be smaller than 700 KB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        contractFileName: file.name,
        contractFileType: file.type,
        contractFileData:
          typeof reader.result === "string" ? reader.result : "",
        contractVersions:
          typeof reader.result === "string"
            ? [
                createContractVersion({
                  name: file.name,
                  type: file.type,
                  data: reader.result,
                }),
              ]
            : [],
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function clearContractFile() {
    setForm((prev) => ({
      ...prev,
      contractVersions: [],
      contractFileName: "",
      contractFileType: "",
      contractFileData: "",
    }));
  }

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "address") setFormError("");
    if (name === "city" && /\d/.test(value)) return;
    if (name === "zipCode" && /[^0-9]/.test(value)) return;
    if (name === "state" && /[^a-zA-Z]/.test(value)) return;
    if (name === "squareFootage" && /[^0-9]/.test(value)) return;

    if (name === "closed" && value === "Yes") {
      const isReady = form.sellerAccepted === "Yes" && form.assigned === "Yes";
      if (!isReady) {
        alert(
          "Cannot close: Offer must be 'Accepted', and 'Assigned' must be 'Yes'.",
        );
        return;
      }
    }

    if (name === "closed") {
      setForm((prev) => ({
        ...prev,
        closed: value,
        ...(value === "No" ? { closedDate: "", closedInMonth: "" } : {}),
      }));
      return;
    }

    if (name === "offerStatus") {
      setForm((prev) => ({
        ...prev,
        offerStatus: value,
        ...(value === "Not Sent"
          ? {
              offerDate: "",
              contractVersions: [],
              contractFileName: "",
              contractFileData: "",
              contractFileType: "",
              sellerAccepted: "No",
              contractPrice: "",
              assigned: "No",
              assignedPrice: "",
              buyerName: "",
              buyerEmail: "",
              closed: "No",
              closedDate: "",
              closedInMonth: "",
            }
          : value === "Offer Sent" && prev.sellerAccepted === "No"
            ? { sellerAccepted: "Waiting" }
            : {}),
      }));
      return;
    }

    if (name === "onMarket") {
      setForm((prev) => ({
        ...prev,
        onMarket: value,
        ...(value !== "Yes"
          ? { listedPrice: "", agentName: "", agentPhone: "", listingUrl: "" }
          : {}),
      }));
      return;
    }

    if (name === "sellerAccepted") {
      setForm((prev) => ({
        ...prev,
        sellerAccepted: value,
        ...(value !== "Yes"
          ? {
              assigned: "No",
              assignedPrice: "",
              buyerName: "",
              buyerEmail: "",
              closed: "No",
              closedDate: "",
              closedInMonth: "",
            }
          : {}),
      }));
      return;
    }

    if (name === "assigned") {
      setForm((prev) => ({
        ...prev,
        assigned: value,
        ...(value !== "Yes"
          ? {
              assignedPrice: "",
              buyerName: "",
              buyerEmail: "",
              closed: "No",
              closedDate: "",
              closedInMonth: "",
            }
          : {}),
      }));
      return;
    }

    if (name === "rehabType") {
      setForm((prev) => ({
        ...prev,
        rehabType: value,
        ...(value === "no-rehab"
          ? {
              rehabCost: "",
              additionalRehabCost: "",
            }
          : {}),
      }));
      return;
    }

    const currencyFields = [
      "arv",
      "listedPrice",
      "rehabCost",
      "additionalRehabCost",
      "desiredProfit",
      "mao",
      "contractPrice",
      "assignedPrice",
      "jvSplit",
      "rent",
    ];
    if (currencyFields.includes(name)) {
      const numericValue = String(value || "").replace(/[^0-9]/g, "");
      const formatted = numericValue
        ? "$" + Number.parseInt(numericValue, 10).toLocaleString("en-US")
        : "";
      setForm((prev) => ({ ...prev, [name]: formatted }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    const currencyFields = [
      "arv",
      "listedPrice",
      "rehabCost",
      "additionalRehabCost",
      "desiredProfit",
      "mao",
      "contractPrice",
      "assignedPrice",
      "jvSplit",
      "rent",
    ];
    if (currencyFields.includes(name) && value) {
      const numericValue = value.replace(/[^0-9]/g, "");
      if (numericValue) {
        const numVal = parseInt(numericValue, 10);
        const parseNumber = (val) =>
          Number(String(val || "0").replace(/[^0-9]/g, ""));
        const nextForm = { ...form, [name]: value };
        const { totalRehabCost } = getWholesaleRehabDetails(nextForm);
        const currentVals = {
          arv: parseNumber(form.arv),
          rehabCost: totalRehabCost,
          mao: parseNumber(form.mao),
          contractPrice: parseNumber(form.contractPrice),
          assignedPrice: parseNumber(form.assignedPrice),
        };
        if (name === "arv") currentVals.arv = numVal;
        if (name === "mao") currentVals.mao = numVal;
        if (name === "contractPrice") currentVals.contractPrice = numVal;
        if (name === "assignedPrice") currentVals.assignedPrice = numVal;

        if (currentVals.arv > 0) {
          if (currentVals.rehabCost > currentVals.arv) {
            alert("Rehab cost cannot be more than ARV.");
            setForm((prev) => ({ ...prev, [name]: "" }));
            return;
          }
          if (currentVals.mao > currentVals.arv) {
            alert("MAO cannot be more than ARV.");
            setForm((prev) => ({ ...prev, [name]: "" }));
            return;
          }
          if (currentVals.contractPrice > currentVals.arv) {
            alert("Contract price cannot be more than ARV.");
            setForm((prev) => ({ ...prev, [name]: "" }));
            return;
          }
          if (
            currentVals.contractPrice > 0 &&
            currentVals.assignedPrice > 0 &&
            currentVals.assignedPrice < currentVals.contractPrice
          ) {
            alert(
              "Assigned price needs to be more than or equal to contract price.",
            );
            setForm((prev) => ({ ...prev, [name]: "" }));
            return;
          }
        }

        const formatted = "$" + numVal.toLocaleString("en-US");
        setForm((prev) => ({ ...prev, [name]: formatted }));
      }
    }
  }

  function handleAddressBlur(event) {
    const cleaned = event.target.value.replace(/[^a-zA-Z0-9]+$/, "");
    setForm((prev) => ({ ...prev, address: cleaned }));
    checkDuplicateAddress(cleaned);
  }

  function checkDuplicateAddress(address) {
    if (!address.trim()) return;
    const existingDeal = findDuplicateByAddress(deals, address);
    if (existingDeal) {
      setFormError(`"${existingDeal.address}" is already in your pipeline.`);
      setFilters((prevFilters) => ({
        ...prevFilters,
        search: existingDeal.address,
      }));
      setTimeout(() => {
        const rowElement = document.querySelector(
          `[data-deal-id="${existingDeal.id}"]`,
        );
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }

  async function addDeal(event) {
    event.preventDefault();

    if (
      !form.address.trim() ||
      !form.city.trim() ||
      !form.zipCode.trim() ||
      !form.state.trim()
    ) {
      alert("Please fill out the required address fields.");
      return;
    }

    const existingDeal = findDuplicateByAddress(deals, form.address);
    if (existingDeal) {
      setFormError(`"${existingDeal.address}" is already in your pipeline.`);
      setFilters((prevFilters) => ({
        ...prevFilters,
        search: existingDeal.address,
      }));
      setTimeout(() => {
        const rowElement = document.querySelector(
          `[data-deal-id="${existingDeal.id}"]`,
        );
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return;
    }

    const parseNumber = (val) => Number(String(val).replace(/[^0-9]/g, ""));

    if (form.offerStatus === "Offer Sent" && !form.contractPrice.trim()) {
      alert("Please fill out Contract Price when the offer is sent.");
      return;
    }

    if (form.closed === "Yes" && !form.closedDate) {
      alert("Please select the close date for a closed deal.");
      return;
    }

    const arvNum = parseNumber(form.arv);
    const maoNum = parseNumber(form.mao);
    const contractNum = parseNumber(form.contractPrice);
    const assignedNum = parseNumber(form.assignedPrice);
    const { totalRehabCost: rehabNum } = getWholesaleRehabDetails(form);

    if (arvNum > 0) {
      if (rehabNum > arvNum) {
        alert("Rehab cost cannot be more than ARV.");
        return;
      }
      if (maoNum > arvNum) {
        alert("MAO cannot be more than ARV.");
        return;
      }
      if (contractNum > arvNum) {
        alert("Contract price cannot be more than ARV.");
        return;
      }
    }
    if (contractNum > 0 && assignedNum > 0 && assignedNum < contractNum) {
      alert("Assigned price needs to be more than or equal to contract price.");
      return;
    }

    const profitNum =
      assignedNum > 0 && contractNum > 0 ? assignedNum - contractNum : 0;

    const { desiredProfit, ...formWithoutProfit } = form;

    const newDeal = {
      ...formWithoutProfit,
      id: crypto.randomUUID(),
      userId: currentUser.id,
      state: form.state.trim().toUpperCase(),
      zipCode: form.zipCode.trim(),
      arv: parseNumber(form.arv),
      listedPrice: parseNumber(form.listedPrice),
      rent: parseNumber(form.rent),
      squareFootage: parseNumber(form.squareFootage),
      rehabCost: rehabNum,
      additionalRehabCost: parseNumber(form.additionalRehabCost),
      mao: parseNumber(form.mao),
      contractPrice: parseNumber(form.contractPrice),
      assignedPrice: parseNumber(form.assignedPrice),
      profit: profitNum,
      contractVersions: form.contractVersions?.length
        ? form.contractVersions
        : form.contractFileData
          ? [
              createContractVersion({
                name: form.contractFileName || "Contract",
                type: form.contractFileType || "application/octet-stream",
                data: form.contractFileData,
              }),
            ]
          : [],
      contractFileName: form.contractFileName || "",
      contractFileData: form.contractFileData || "",
      contractFileType: form.contractFileType || "",
      buyerName: form.buyerName?.trim() || "",
      buyerEmail: form.buyerEmail?.trim().toLowerCase() || "",
      jvDeal: form.jvDeal || "No",
      jvPartnerName:
        form.jvDeal === "Yes" ? form.jvPartnerName?.trim() || "" : "",
      jvPartnerEmail:
        form.jvDeal === "Yes"
          ? form.jvPartnerEmail?.trim().toLowerCase() || ""
          : "",
      jvSplit: form.jvDeal === "Yes" ? parseNumber(form.jvSplit) : 0,
      closedDate: form.closed === "Yes" ? form.closedDate : "",
      closedInMonth:
        form.closed === "Yes" && form.closedDate
          ? form.closedDate.slice(5, 7)
          : "",
    };

    try {
      setTableLoading(true);

      if (
        form.assigned === "Yes" &&
        form.buyerEmail?.trim() &&
        form.buyerName?.trim()
      ) {
        const existingBuyers = await fetchBuyers(currentUser.id);
        const newEmail = form.buyerEmail.trim().toLowerCase();
        const isDuplicate = existingBuyers.some(
          (b) => b.email?.toLowerCase() === newEmail,
        );
        if (!isDuplicate) {
          const newBuyer = {
            id: crypto.randomUUID(),
            userId: currentUser.id,
            fullName: form.buyerName.trim(),
            email: newEmail,
            phone: "",
            city: form.city.trim(),
            state: form.state.trim().toUpperCase(),
            realEstateType: "Single Family",
          };
          await saveBuyer(newBuyer);
        }
      }

      const versionsWithData = (newDeal.contractVersions || []).filter(
        (v) => v.data,
      );
      await Promise.all(
        versionsWithData.map((v) =>
          saveContractVersion({
            id: v.id,
            dealId: newDeal.id,
            userId: currentUser.id,
            name: v.name,
            type: v.type,
            data: v.data,
            uploadedAt: v.uploadedAt,
          }),
        ),
      );

      const savedDeal = (await saveDeal(newDeal)) || newDeal;
      setDeals((prevDeals) => [...prevDeals, savedDeal]);
      setForm(createEmptyDealForm());
      if (newDeal.offerDate || newDeal.closedDate) {
        setFilters(createDefaultFilters());
      }
    } catch (error) {
      console.error("Failed to save property", error);
      alert("Unable to save property. Check your database connection.");
    } finally {
      setTableLoading(false);
    }
  }

  return {
    form,
    tableLoading,
    resetForm,
    formError,
    handleChange,
    handleBlur,
    handleContractFileChange,
    clearContractFile,
    handleAddressBlur,
    checkDuplicateAddress,
    addDeal,
  };
}
