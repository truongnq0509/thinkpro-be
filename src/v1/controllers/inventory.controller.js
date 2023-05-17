import Inventory from "../models/invetory.model"
import inventorySchema from "../validations/inventory.validation"
import createError from "http-errors"


export async function get(req, res, next) {
	try {
		const { id } = req.params
		const inventory = await Inventory.findOne({
			productId: id
		}).select('quantity')
		return res.json({
			message: "successfully",
			data: {
				stock: inventory.quantity
			}
		})
	} catch (error) {
		next(error)
	}
}

export async function createAndUpdate(req, res, next) {
	try {
		const { error } = inventorySchema.validate(req.body, { abortEarly: false });

		if (error) {
			const errors = {};
			error.details.forEach((e) => (errors[e.path] = e.message));
			throw createError.BadRequest(errors);
		}

		const inventory = await Inventory.findOneAndUpdate({
			productId: req.body.productId,
		}, {
			$set: {
				quantity: req.body.quantity
			}
		}, {
			new: true,
			upsert: true
		})

		return res.json({
			message: "successfully",
			data: inventory
		})
	} catch (error) {
		next(error)
	}
}