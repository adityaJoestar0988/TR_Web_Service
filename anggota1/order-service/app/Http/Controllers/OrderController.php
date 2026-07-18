<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    /**
     * Menampilkan semua data order
     */
    public function index()
    {
        return response()->json([
            'data' => Order::all()
        ]);
    }


    /**
     * Menyimpan order baru
     */
    public function store(Request $request)
    {
        $request->validate([
            'customerName' => 'required|string',
            'productName' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'price' => 'required|numeric',
            'status' => 'nullable|string'
        ]);


        $order = Order::create([
            'customer_name' => $request->customerName,
            'product_name' => $request->productName,
            'quantity' => $request->quantity,
            'price' => $request->price,
            'status' => $request->status ?? 'PENDING'
        ]);


        return response()->json([
            'message' => 'Order berhasil dibuat',
            'data' => $order
        ], 201);
    }


    /**
     * Menampilkan detail order
     */
    public function show($id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'message' => 'Order tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'data' => $order
        ]);
    }


    /**
     * Update order
     */
    public function update(Request $request, $id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'message' => 'Order tidak ditemukan'
            ], 404);
        }


        $order->update([
            'customer_name' => $request->customerName ?? $order->customer_name,
            'product_name' => $request->productName ?? $order->product_name,
            'quantity' => $request->quantity ?? $order->quantity,
            'price' => $request->price ?? $order->price,
            'status' => $request->status ?? $order->status
        ]);


        return response()->json([
            'message' => 'Order berhasil diperbarui',
            'data' => $order
        ]);
    }


    /**
     * Hapus order
     */
    public function destroy($id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'message' => 'Order tidak ditemukan'
            ], 404);
        }


        $order->delete();

        return response()->json([
            'message' => 'Order berhasil dihapus'
        ]);
    }
}