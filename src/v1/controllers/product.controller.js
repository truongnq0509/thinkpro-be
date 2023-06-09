import Product from "../models/product.model";
import Category from "../models/category.model";
import Brand from "../models/brand.model";
import Order from "../models/order.model";
import productSchema from "../validations/product.validation";
import createError from "http-errors";
import { resnameKeyToObject } from "../utils/resname_key.util";

export async function get(req, res, next) {
	try {
		const { _page = 1, _sort = "createdAt", _order = "asc", _limit = 10, slug = false } = req.query;

		const options = {
			page: _page,
			limit: _limit,
			sort: {
				[_sort]: _order == "desc" ? -1 : 1,
			},
			select: ["-categoryId", "-brandId", "-deleted", "-deletedAt"],
		};

		if (slug) {
			let product = await Product.findOne({
				slug,
			})
				.select(["-deleted", "-deletedAt"])
				.populate({
					path: "categoryId",
					select: ["-deleted", "-deletedAt", "-categoryId", "-products", "-brands"],
				})
				.populate({
					path: "brandId",
					select: ["-deleted", "-deletedAt", "-categoryIds", "-products", "-parentId"],
				});

			if (!product) {
				throw createError.BadRequest("Sản phẩm này không tồn tại");
			}

			product = resnameKeyToObject(product.toObject(), "category", "categoryId");
			product = resnameKeyToObject(product, "brand", "brandId");

			return res.json({
				message: "successfully",
				data: product,
			});
		} else {
			const {
				docs,
				totalPages,
				totalDocs,
				limit,
				hasPrevPage,
				pagingCounter,
				hasNextPage,
				page,
				nextPage,
				prevPage,
			} = await Product.paginate({}, options);

			return res.json({
				message: "successfully",
				data: docs,
				paginate: {
					limit,
					totalDocs,
					totalPages,
					page,
					pagingCounter,
					hasPrevPage,
					hasNextPage,
					prevPage,
					nextPage,
				},
			});
		}
	} catch (error) {
		next(error);
	}
}

export async function store(req, res, next) {
	try {
		const products = await Product.findDeleted({}).select(["-categoryId", "-brandId", "-deleted", "-deletedAt"]);
		return res.json({
			message: "successfully",
			data: products,
		});
	} catch (error) {
		next(error);
	}
}

export async function create(req, res, next) {
	try {
		const { error } = productSchema.validate(req.body, { abortEarly: false });

		if (error) {
			const errors = {};
			error.details.forEach((e) => (errors[e.path] = e.message));
			throw createError.BadRequest(errors);
		}

		const product = await Product.create(req.body);

		await Category.findOneAndUpdate(
			{
				_id: req.body.categoryId,
			},
			{
				$addToSet: {
					products: product._id,
				},
			}
		);

		await Brand.findOneAndUpdate(
			{
				_id: req.body.brandId,
			},
			{
				$addToSet: {
					products: product._id,
				},
			}
		);

		return res.status(201).json({
			message: "successfully",
			data: product,
		});
	} catch (error) {
		next(error);
	}
}

export async function update(req, res, next) {
	try {
		const { error } = productSchema.validate(req.body, { abortEarly: false });

		if (error) {
			const errors = {};
			error.details.forEach((e) => (errors[e.path] = e.message));
			throw createError.BadRequest(errors);
		}

		const product = await Product.updateOne(
			{
				_id: req.params.id,
			},
			req.body
		);

		return res.status(200).json({
			message: "successfully",
			data: product,
		});
	} catch (error) {
		next(error);
	}
}

export async function remove(req, res, next) {
	try {
		console.log(req.params.id);
		const product = await Product.findOneWithDeleted({
			_id: req.params.id,
		});

		const isForce = JSON.parse(req.query.force || false);

		if (!product) {
			throw createError.BadRequest("Sản phẩm này không tồn tại");
		}

		if (isForce) {
			await product.deleteOne();
		} else {
			await product.delete();
		}

		return res.json({
			message: "successfully",
			data: product,
		});
	} catch (error) {
		next(error);
	}
}

export async function restore(req, res, next) {
	try {
		const product = await Product.findOneWithDeleted({
			_id: req.params.id,
		});

		if (!product) {
			throw createError.BadRequest("Sản phẩm này không tồn tại");
		}

		if (!product?.deleted) {
			throw createError.BadRequest("Sản phẩm chưa bị xóa mềm");
		}

		await product.restore();

		return res.json({
			message: "successfully",
		});
	} catch (error) {
		next(error);
	}
}

export async function search(req, res, next) {
	try {
		const keyword = req.query.keyword
		const result = await Product.find({
			"name": {
				$regex: ".*" + keyword + "*.",
				$options: "i"
			}
		})
			.select(["-deleted", "-deletedAt", "-createdAt", "-updatedAt"])
			.populate({
				path: "categoryId",
				select: ["-deleted", "-deletedAt", "-categoryId", "-products", "-brands"],
			}).populate({
				path: "brandId",
				select: ["-deleted", "-deletedAt", "-categoryIds", "-products", "-parentId"],
			});

		return res.json({
			data: "successfully",
			data: result
		})
	} catch (error) {
		next(error)
	}
}

export async function dashboard(req, res, next) {
	try {
		const products = await Product.find({})
		const categories = await Category.find({})
		const brands = await Brand.find({})
		const orders = await Order.find({ status: { $ne: 'cancelled' } });
		const payment = await Order.find({ $and: [{ 'payment.status': true }, { 'status': { $ne: 'cancelled' } }] });

		const money = payment.reduce((acc, item) => {
			return acc += item?.bill
		}, 0)

		return res.json({
			message: "successfully",
			data: {
				products: products?.length,
				categories: categories?.length,
				brands: brands?.length,
				orders: orders?.length,
				money
			}
		})

	} catch (error) {
		next(error)
	}
}
