<<<<<<< HEAD
const express = require('express');
const router = express.Router();

// --- 1. GET ALL CONVERSATIONS (For Admin Inbox Sidebar) ---
router.get('/conversations', async (req, res) => {
    try {
        // FIXED: Filter out invalid customer IDs more strictly
        const [results] = await req.db.query(`
            SELECT * FROM chat_conversations 
            WHERE customer_id IS NOT NULL 
            AND customer_id != 'undefined' 
            AND customer_id != 'null'
            AND customer_id != ''
            AND customer_id != '0'
            AND CAST(customer_id AS CHAR) != '0'
            ORDER BY last_message_at DESC
        `);
        res.json(results);
    } catch (err) {
        console.error("Error fetching conversations:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- 2. GET MESSAGE HISTORY (For Chat Window) ---
router.get('/history/:customerId', async (req, res) => {
    const { customerId } = req.params;
    const { side } = req.query; // 'admin' or 'customer'

    // --- STRICT SECURITY FIX: PREVENT INVALID ID ACCESS ---
    // Block: undefined, null, empty string, '0', 0
    if (!customerId || 
        customerId === 'undefined' || 
        customerId === 'null' || 
        customerId === '' ||
        customerId === '0' ||
        customerId === 0) {
        console.warn(`[CHAT] Blocked invalid customer ID: ${customerId}`);
        return res.json([]); // Return empty immediately
    }

    try {
        // A. Find the EXACT conversation for THIS customer ONLY
        const [convRows] = await req.db.query(
            "SELECT id FROM chat_conversations WHERE customer_id = ? LIMIT 1", 
            [customerId]
        );
        
        if (convRows.length === 0) {
            console.log(`[CHAT] No conversation found for customer_id: ${customerId}`);
            return res.json([]); // No chat history yet
        }
        
        const conversationId = convRows[0].id;
        console.log(`[CHAT] Found conversation_id: ${conversationId} for customer_id: ${customerId}`);

        // B. If ADMIN opens the chat, mark it as "Read"
        if (side === 'admin') {
            await req.db.query(
                "UPDATE chat_conversations SET is_read_by_admin = 1 WHERE id = ?", 
                [conversationId]
            );
        }

        // C. Fetch messages ONLY for THIS specific conversation
        const [messages] = await req.db.query(
            "SELECT sender_type, message_text, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC",
            [conversationId]
        );

        console.log(`[CHAT] Retrieved ${messages.length} messages for conversation_id: ${conversationId}`);

        // D. Format time nicely
        const formattedMessages = messages.map(msg => ({
            sender: msg.sender_type,
            text: msg.message_text,
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        res.json(formattedMessages);

    } catch (err) {
        console.error("Error fetching history:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- 3. SEND MESSAGE (Handles both Customer & Admin) ---
router.post('/send', async (req, res) => {
    const { customer_id, customer_name, customer_email, message_text, sender_type } = req.body;

    // --- STRICT SECURITY FIX: PREVENT INVALID IDs ---
    if (!customer_id || 
        customer_id === 'undefined' || 
        customer_id === 'null' || 
        customer_id === '' ||
        customer_id === '0' ||
        customer_id === 0) {
        console.error(`[CHAT] Rejected message send with invalid customer_id: ${customer_id}`);
        return res.status(400).json({ error: "Invalid Customer ID. Cannot start chat." });
    }

    try {
        // A. Check if conversation exists for THIS EXACT customer
        const [convRows] = await req.db.query(
            "SELECT id FROM chat_conversations WHERE customer_id = ? LIMIT 1", 
            [customer_id]
        );
        
        let conversationId;

        // B. Determine Read Status
        const isReadByAdmin = sender_type === 'admin' ? 1 : 0;

        if (convRows.length === 0) {
            // --- NEW CONVERSATION ---
            console.log(`[CHAT] Creating NEW conversation for customer_id: ${customer_id}`);
            
            const [newConv] = await req.db.query(
                `INSERT INTO chat_conversations 
                (customer_id, customer_name, customer_email, last_message, last_message_at, is_read_by_admin) 
                VALUES (?, ?, ?, ?, NOW(), ?)`,
                [customer_id, customer_name, customer_email || null, message_text, isReadByAdmin]
            );
            conversationId = newConv.insertId;
            
            console.log(`[CHAT] Created conversation_id: ${conversationId} for customer_id: ${customer_id}`);
        } else {
            // --- EXISTING CONVERSATION ---
            conversationId = convRows[0].id;
            
            console.log(`[CHAT] Updating existing conversation_id: ${conversationId} for customer_id: ${customer_id}`);
            
            // Update conversation (keep customer_id unchanged, update name/email if provided)
            await req.db.query(
                `UPDATE chat_conversations 
                SET customer_name = ?, 
                    customer_email = COALESCE(?, customer_email),
                    last_message = ?, 
                    last_message_at = NOW(), 
                    is_read_by_admin = ? 
                WHERE id = ?`,
                [customer_name, customer_email || null, message_text, isReadByAdmin, conversationId]
            );
        }

        // C. Insert the actual message
        await req.db.query(
            `INSERT INTO chat_messages 
            (conversation_id, sender_type, message_text, created_at) 
            VALUES (?, ?, ?, NOW())`,
            [conversationId, sender_type, message_text]
        );

        console.log(`[CHAT] Message sent successfully to conversation_id: ${conversationId}`);

        res.json({ success: true, conversationId, customerId: customer_id });

    } catch (err) {
        console.error("Error sending message:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- 4. (OPTIONAL) DELETE/CLEAR CONVERSATION ---
router.delete('/conversation/:customerId', async (req, res) => {
    const { customerId } = req.params;
    
    if (!customerId || customerId === 'undefined' || customerId === '0') {
        return res.status(400).json({ error: "Invalid customer ID" });
    }

    try {
        // Find conversation
        const [convRows] = await req.db.query(
            "SELECT id FROM chat_conversations WHERE customer_id = ?", 
            [customerId]
        );
        
        if (convRows.length === 0) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        
        const conversationId = convRows[0].id;
        
        // Delete messages first (foreign key)
        await req.db.query("DELETE FROM chat_messages WHERE conversation_id = ?", [conversationId]);
        
        // Delete conversation
        await req.db.query("DELETE FROM chat_conversations WHERE id = ?", [conversationId]);
        
        res.json({ success: true, message: "Conversation deleted" });
        
    } catch (err) {
        console.error("Error deleting conversation:", err);
        res.status(500).json({ error: err.message });
    }
});

=======
const express = require('express');
const router = express.Router();

// --- 1. GET ALL CONVERSATIONS (For Admin Inbox Sidebar) ---
router.get('/conversations', async (req, res) => {
    try {
        // FIXED: Filter out invalid customer IDs more strictly
        const [results] = await req.db.query(`
            SELECT * FROM chat_conversations 
            WHERE customer_id IS NOT NULL 
            AND customer_id != 'undefined' 
            AND customer_id != 'null'
            AND customer_id != ''
            AND customer_id != '0'
            AND CAST(customer_id AS CHAR) != '0'
            ORDER BY last_message_at DESC
        `);
        res.json(results);
    } catch (err) {
        console.error("Error fetching conversations:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- 2. GET MESSAGE HISTORY (For Chat Window) ---
router.get('/history/:customerId', async (req, res) => {
    const { customerId } = req.params;
    const { side } = req.query; // 'admin' or 'customer'

    // --- STRICT SECURITY FIX: PREVENT INVALID ID ACCESS ---
    // Block: undefined, null, empty string, '0', 0
    if (!customerId || 
        customerId === 'undefined' || 
        customerId === 'null' || 
        customerId === '' ||
        customerId === '0' ||
        customerId === 0) {
        console.warn(`[CHAT] Blocked invalid customer ID: ${customerId}`);
        return res.json([]); // Return empty immediately
    }

    try {
        // A. Find the EXACT conversation for THIS customer ONLY
        const [convRows] = await req.db.query(
            "SELECT id FROM chat_conversations WHERE customer_id = ? LIMIT 1", 
            [customerId]
        );
        
        if (convRows.length === 0) {
            console.log(`[CHAT] No conversation found for customer_id: ${customerId}`);
            return res.json([]); // No chat history yet
        }
        
        const conversationId = convRows[0].id;
        console.log(`[CHAT] Found conversation_id: ${conversationId} for customer_id: ${customerId}`);

        // B. If ADMIN opens the chat, mark it as "Read"
        if (side === 'admin') {
            await req.db.query(
                "UPDATE chat_conversations SET is_read_by_admin = 1 WHERE id = ?", 
                [conversationId]
            );
        }

        // C. Fetch messages ONLY for THIS specific conversation
        const [messages] = await req.db.query(
            "SELECT sender_type, message_text, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC",
            [conversationId]
        );

        console.log(`[CHAT] Retrieved ${messages.length} messages for conversation_id: ${conversationId}`);

        // D. Format time nicely
        const formattedMessages = messages.map(msg => ({
            sender: msg.sender_type,
            text: msg.message_text,
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        res.json(formattedMessages);

    } catch (err) {
        console.error("Error fetching history:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- 3. SEND MESSAGE (Handles both Customer & Admin) ---
router.post('/send', async (req, res) => {
    const { customer_id, customer_name, customer_email, message_text, sender_type } = req.body;

    // --- STRICT SECURITY FIX: PREVENT INVALID IDs ---
    if (!customer_id || 
        customer_id === 'undefined' || 
        customer_id === 'null' || 
        customer_id === '' ||
        customer_id === '0' ||
        customer_id === 0) {
        console.error(`[CHAT] Rejected message send with invalid customer_id: ${customer_id}`);
        return res.status(400).json({ error: "Invalid Customer ID. Cannot start chat." });
    }

    try {
        // A. Check if conversation exists for THIS EXACT customer
        const [convRows] = await req.db.query(
            "SELECT id FROM chat_conversations WHERE customer_id = ? LIMIT 1", 
            [customer_id]
        );
        
        let conversationId;

        // B. Determine Read Status
        const isReadByAdmin = sender_type === 'admin' ? 1 : 0;

        if (convRows.length === 0) {
            // --- NEW CONVERSATION ---
            console.log(`[CHAT] Creating NEW conversation for customer_id: ${customer_id}`);
            
            const [newConv] = await req.db.query(
                `INSERT INTO chat_conversations 
                (customer_id, customer_name, customer_email, last_message, last_message_at, is_read_by_admin) 
                VALUES (?, ?, ?, ?, NOW(), ?)`,
                [customer_id, customer_name, customer_email || null, message_text, isReadByAdmin]
            );
            conversationId = newConv.insertId;
            
            console.log(`[CHAT] Created conversation_id: ${conversationId} for customer_id: ${customer_id}`);
        } else {
            // --- EXISTING CONVERSATION ---
            conversationId = convRows[0].id;
            
            console.log(`[CHAT] Updating existing conversation_id: ${conversationId} for customer_id: ${customer_id}`);
            
            // Update conversation (keep customer_id unchanged, update name/email if provided)
            await req.db.query(
                `UPDATE chat_conversations 
                SET customer_name = ?, 
                    customer_email = COALESCE(?, customer_email),
                    last_message = ?, 
                    last_message_at = NOW(), 
                    is_read_by_admin = ? 
                WHERE id = ?`,
                [customer_name, customer_email || null, message_text, isReadByAdmin, conversationId]
            );
        }

        // C. Insert the actual message
        await req.db.query(
            `INSERT INTO chat_messages 
            (conversation_id, sender_type, message_text, created_at) 
            VALUES (?, ?, ?, NOW())`,
            [conversationId, sender_type, message_text]
        );

        console.log(`[CHAT] Message sent successfully to conversation_id: ${conversationId}`);

        res.json({ success: true, conversationId, customerId: customer_id });

    } catch (err) {
        console.error("Error sending message:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- 4. (OPTIONAL) DELETE/CLEAR CONVERSATION ---
router.delete('/conversation/:customerId', async (req, res) => {
    const { customerId } = req.params;
    
    if (!customerId || customerId === 'undefined' || customerId === '0') {
        return res.status(400).json({ error: "Invalid customer ID" });
    }

    try {
        // Find conversation
        const [convRows] = await req.db.query(
            "SELECT id FROM chat_conversations WHERE customer_id = ?", 
            [customerId]
        );
        
        if (convRows.length === 0) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        
        const conversationId = convRows[0].id;
        
        // Delete messages first (foreign key)
        await req.db.query("DELETE FROM chat_messages WHERE conversation_id = ?", [conversationId]);
        
        // Delete conversation
        await req.db.query("DELETE FROM chat_conversations WHERE id = ?", [conversationId]);
        
        res.json({ success: true, message: "Conversation deleted" });
        
    } catch (err) {
        console.error("Error deleting conversation:", err);
        res.status(500).json({ error: err.message });
    }
});

>>>>>>> 46f177dc8ce17a0f72dc7182eb1b2842c55e7a13
module.exports = router;