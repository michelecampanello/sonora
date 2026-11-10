import { asyncHandler } from "../asyncHandler.js";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressFields,
} from "../services/addresses.service.js";
import { RecordLimitError } from "../services/savedRecords.js";
import { isUuid } from "../uuid.js";
import { asRecord, isPersonName, locationError, parseLocation, text } from "../validation.js";
import type { Address, ApiError } from "../types.js";

// Le modifiche rispondono con l'elenco intero: il predefinito può passare a un altro indirizzo.
type ListResponse = Address[] | ApiError;

const NOT_FOUND = { error: "Indirizzo non trovato" };

function parseAddress(value: unknown): AddressFields | string {
  const source = asRecord(value);
  const fields: AddressFields = { name: text(source.name), ...parseLocation(source) };
  if (!isPersonName(fields.name)) return "Nome del destinatario non valido";
  return locationError(fields) ?? fields;
}

/** GET /api/account/addresses */
export const getAddresses = asyncHandler<{}, Address[], unknown, unknown>(async (req, res) => {
  res.json(await listAddresses(req.user!.id));
});

/** POST /api/account/addresses — il primo indirizzo diventa il predefinito */
export const postAddress = asyncHandler<{}, ListResponse, unknown, unknown>(async (req, res) => {
  const fields = parseAddress(req.body);
  if (typeof fields === "string") return res.status(400).json({ error: fields });

  try {
    await createAddress(req.user!.id, fields);
  } catch (err) {
    if (err instanceof RecordLimitError) {
      return res.status(409).json({ error: "Hai raggiunto il numero massimo di indirizzi" });
    }
    throw err;
  }
  return res.status(201).json(await listAddresses(req.user!.id));
});

/** PUT /api/account/addresses/:id */
export const putAddress = asyncHandler<{ id: string }, ListResponse, unknown, unknown>(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json(NOT_FOUND);
  const fields = parseAddress(req.body);
  if (typeof fields === "string") return res.status(400).json({ error: fields });

  if (!(await updateAddress(req.user!.id, req.params.id, fields))) return res.status(404).json(NOT_FOUND);
  return res.json(await listAddresses(req.user!.id));
});

/** DELETE /api/account/addresses/:id */
export const removeAddress = asyncHandler<{ id: string }, ListResponse, unknown, unknown>(async (req, res) => {
  if (!isUuid(req.params.id) || !(await deleteAddress(req.user!.id, req.params.id))) {
    return res.status(404).json(NOT_FOUND);
  }
  return res.json(await listAddresses(req.user!.id));
});

/** POST /api/account/addresses/:id/default */
export const makeAddressDefault = asyncHandler<{ id: string }, ListResponse, unknown, unknown>(async (req, res) => {
  if (!isUuid(req.params.id) || !(await setDefaultAddress(req.user!.id, req.params.id))) {
    return res.status(404).json(NOT_FOUND);
  }
  return res.json(await listAddresses(req.user!.id));
});
