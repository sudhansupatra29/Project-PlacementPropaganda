// ChatBot Module for floating chatbot.
(async function() {
    const API_BASE = 'http://localhost:5000/api'; // your backend
    const USER_ID = localStorage.getItem('userId'); // fetch logged-in user

    const style = document.createElement('style');
    style.textContent = `
    #chatMessages {
    display: flex;
    flex-direction: column;
    }

    .chat-bubble {
    max-width: 80%;
    margin: 6px;
    padding: 8px 12px;
    border-radius: 12px;
    line-height: 1.4;
    word-wrap: break-word;
    }

    .chat-bubble.user {
    background: #111;
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 0;
    }

    .chat-bubble.bot {
    background: #f2f2f2;
    color: #111;
    align-self: flex-start;
    border-bottom-left-radius: 0;
    }
    `;
    document.head.appendChild(style);

    // Create floating chatbot button
    const chatBtn = document.createElement('button');
    chatBtn.innerText = '💬';
    chatBtn.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
        border-radius: 50%; background: #111; color: white; border: none;
        cursor: pointer; z-index: 9999; font-weight: bold;
    `;
    document.body.appendChild(chatBtn);

    // Create chat panel (minimal inline style; size/placement set by updatePanel())
    const chatPanel = document.createElement('div');
    chatPanel.style.cssText = `
        position: fixed; background: white; border: 1px solid #ccc; border-radius: 12px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2); display: none; flex-direction: column;
        z-index: 9999; overflow: hidden;
        animation: slideUp 0.3s ease-out;
    `;
    chatPanel.innerHTML = `
        <div id="chatHeader" style="background:#111; color:white; padding:10px; font-weight:bold;">
            Assistant
            <span id="closeChat" style="float:right; cursor:pointer;">✕</span>
        </div>
        <div id="chatMessages" style="flex:1; padding:10px; overflow-y:auto; font-size:14px;"></div>
        <div style="display:flex; border-top:1px solid #ccc;">
            <input id="chatInput" type="text" placeholder="Type..." style="flex:1; border:none; padding:8px; font-size:14px;" />
            <button id="chatSend" style="background:#111; color:white; border:none; padding:8px 12px; cursor:pointer;">Send</button>
        </div>
    `;
    document.body.appendChild(chatPanel);

    const chatMessages = chatPanel.querySelector('#chatMessages');
    const chatInput = chatPanel.querySelector('#chatInput');
    const chatSend = chatPanel.querySelector('#chatSend');

    // Show/hide
    chatBtn.addEventListener('click', () => {
        chatPanel.style.display = chatPanel.style.display === 'flex' ? 'none' : 'flex';
        chatPanel.style.flexDirection = 'column';
    });
    chatPanel.querySelector('#closeChat').addEventListener('click', () => chatPanel.style.display = 'none');

    // Fetch user data from backend
    let userData = {};
    if (USER_ID) {
        try {
            const resp = await fetch(`${API_BASE}/chatbot/user/${USER_ID}`);
            const data = await resp.json();
            if (data.success) userData = data.userData;
        } catch (err) {
            console.error('Error fetching user data:', err);
        }
    }

    // Update panel size & anchoring to maintain a 4:3 ratio
    function updatePanel() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const marginFactor = 0.9;
        const maxWidth = w * marginFactor;
        const maxHeight = h * marginFactor;

        let width = Math.min(maxWidth, Math.round((4 / 3) * maxHeight));
        let height = Math.round((3 / 4) * width);

        if (height > maxHeight) {
            height = maxHeight;
            width = Math.round((4 / 3) * height);
        }

        chatPanel.style.width = Math.round(width) + 'px';
        chatPanel.style.height = Math.round(height) + 'px';
        chatPanel.style.left = '50%';
        chatPanel.style.top = '50%';
        chatPanel.style.right = 'auto';
        chatPanel.style.bottom = 'auto';
        chatPanel.style.transform = 'translate(-50%,-50%)';
        disableDragging();
    }

    // Simple assistant response function
    async function getBotResponse(message) {
        // Defensive userData handling
        const academics = Array.isArray(userData.academics) ? userData.academics.join(', ') : (userData.academics || 'None');
        const skills = Array.isArray(userData.skills) ? userData.skills.join(', ') : (userData.skills || 'None');
        const hobbies = Array.isArray(userData.hobbies) ? userData.hobbies.join(', ') : (userData.hobbies || 'None');

        let systemPrompt = `You are an internship guide. Keep the replies short, precise and formal.
        The user's info:
        Name: ${userData.name || 'Unknown'}
        Academics: ${academics}
        Skills: ${skills}
        Hobbies: ${hobbies}
        Also if you are to write inline math use dollar signs ($ .... $).`;

        const payload = {
            model: 'openai/gpt-oss-20b',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ]
        };

        try {
            const res = await fetch(`${API_BASE}/chatbot/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            return data.reply;
        } catch (err) {
            console.error(err);
            return "Error connecting to AI API.";
        }
    }

    // Send message (safer DOM insertion)
    async function sendMessage() {
        const msg = chatInput.value.trim();
        if (!msg) return;

        const userDiv = document.createElement('div');
        userDiv.className = 'chat-bubble user';
        userDiv.innerHTML = escapeHtml(msg);
        chatMessages.appendChild(userDiv);

        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const botReplyDiv = document.createElement('div');
        botReplyDiv.className = 'chat-bubble bot';
        botReplyDiv.innerHTML = '⟳ Thinking...';
        chatMessages.appendChild(botReplyDiv);

        const reply = await getBotResponse(msg);
        botReplyDiv.innerHTML = DOMPurify.sanitize(marked.parse(reply));
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (window.MathJax) MathJax.typesetPromise();

    }

    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    // Basic HTML-escape to avoid injecting raw user/API HTML
    function escapeHtml(str) {
        if (typeof str !== 'string') return ''; // This alone is a if statement, below is just a block.
        return str.replace(/[&<>"']/g, function(m) {
            return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
        });
    }

    // Dragging helpers (disabled by default; kept for potential desktop-enable)
    let dragState = { enabled: false, isDragging: false, offsetX: 0, offsetY: 0 };
    // if you wish to make chatbot draggable.
    function enableDragging() { dragState.enabled = true; chatPanel.querySelector('#chatHeader').style.cursor = 'move'; }
    // default - good enough
    function disableDragging() { dragState.enabled = false; chatPanel.querySelector('#chatHeader').style.cursor = 'default'; }

    // Optional: enable dragging only if developer explicitly wants it (kept off to honor anchors)
    // header drag events still present but respect dragState.enabled
    const header = chatPanel.querySelector('#chatHeader');
    header.addEventListener('mousedown', e => {
        if (!dragState.enabled) return;
        dragState.isDragging = true;
        // Use clientX/Y relative to panel position
        dragState.offsetX = e.clientX - chatPanel.getBoundingClientRect().left;
        dragState.offsetY = e.clientY - chatPanel.getBoundingClientRect().top;
        // remove transform when dragging
        chatPanel.style.transform = 'none';
    });
    document.addEventListener('mouseup', () => dragState.isDragging = false);
    document.addEventListener('mousemove', e => {
        if (!dragState.isDragging) return;
        let left = e.clientX - dragState.offsetX;
        let top = e.clientY - dragState.offsetY;
        // constrain inside viewport
        left = Math.max(8, Math.min(left, window.innerWidth - chatPanel.offsetWidth - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - chatPanel.offsetHeight - 8));
        chatPanel.style.left = left + 'px';
        chatPanel.style.top = top + 'px';
        chatPanel.style.right = 'auto';
        chatPanel.style.bottom = 'auto';
    });

    // React to resize/orientation changes
    window.addEventListener('resize', updatePanel);
    window.addEventListener('orientationchange', updatePanel);

    // Initial layout
    updatePanel();

})();
