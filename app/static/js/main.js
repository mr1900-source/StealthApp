// QuickTrip Client-Side JavaScript

document.addEventListener('DOMContentLoaded', function() {
    
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
    
    // Form validation and enhancement
    const generateForm = document.getElementById('generateForm');
    if (generateForm) {
        generateForm.addEventListener('submit', function(e) {
            const formData = new FormData(generateForm);
            let hasValue = false;
            
            // Check if at least some fields are filled
            for (let [key, value] of formData.entries()) {
                if (value.trim() && key !== 'csrf_token') {
                    hasValue = true;
                    break;
                }
            }
            
            if (!hasValue) {
                e.preventDefault();
                alert('Please fill in at least your destination and duration!');
                return;
            }
            
            // Show loading state
            showLoading();
        });
    }
    
    // Character counter for interests
    const interestsTextarea = document.getElementById('interests');
    if (interestsTextarea) {
        const counter = document.createElement('small');
        counter.className = 'text-muted';
        counter.style.float = 'right';
        interestsTextarea.parentElement.appendChild(counter);
        
        function updateCounter() {
            const length = interestsTextarea.value.length;
            counter.textContent = `${length}/500 characters`;
            if (length > 450) counter.style.color = 'var(--warning)';
            else counter.style.color = '';
        }
        
        interestsTextarea.addEventListener('input', updateCounter);
        updateCounter();
    }
    
    // Smooth scroll to itinerary after generation
    const itineraryContainer = document.getElementById('itineraryResult');
    if (itineraryContainer && window.location.hash !== '#top') {
        setTimeout(() => {
            itineraryContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
    
    // Stop reordering functionality
    window.moveUp = function(button) {
        const card = button.closest('.itinerary-stop');
        const previous = card.previousElementSibling;
        if (previous && previous.classList.contains('itinerary-stop')) {
            card.parentNode.insertBefore(card, previous);
            flashElement(card);
        }
    };
    
    window.moveDown = function(button) {
        const card = button.closest('.itinerary-stop');
        const next = card.nextElementSibling;
        if (next && (next.classList.contains('itinerary-stop') || next.classList.contains('extra-tips'))) {
            if (next.classList.contains('extra-tips')) return; // Can't move past tips
            card.parentNode.insertBefore(next, card);
            flashElement(card);
        }
    };
    
    // Delete confirmation with custom styling
    const deleteForms = document.querySelectorAll('form[action*="delete"]');
    deleteForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!confirm('Are you sure you want to delete this itinerary? This cannot be undone.')) {
                e.preventDefault();
            }
        });
    });
    
    // Save functionality with itinerary collection
    window.prepareSave = function() {
        let result = "";
        document.querySelectorAll('.itinerary-stop').forEach(card => {
            const time = card.querySelector('.stop-time')?.textContent.trim() || '';
            const title = card.querySelector('.stop-title')?.textContent.trim() || '';
            const description = card.querySelector('.stop-description')?.textContent.trim() || '';
            const metaItems = card.querySelectorAll('.meta-item');
            let meta = '';
            metaItems.forEach(item => {
                meta += item.textContent.trim() + ' | ';
            });
            
            if (time && title) {
                result += `STOP: ${time} - ${title}\n${description}\n${meta.slice(0, -3)}\n\n`;
            }
        });
        
        // Include extra tips if present
        const extraTips = document.querySelector('.extra-tips');
        if (extraTips) {
            const tipsList = extraTips.querySelectorAll('li');
            if (tipsList.length > 0) {
                result += "STOP: EXTRA TIPS\n";
                tipsList.forEach(tip => {
                    result += `${tip.textContent.trim()}\n`;
                });
            }
        }
        
        document.getElementById('save_input').value = result;
        return true;
    };
    
    // Helper functions
    function showLoading() {
        const loading = document.getElementById('loadingState');
        if (loading) {
            loading.classList.add('active');
        }
    }
    
    function flashElement(element) {
        element.style.background = 'rgba(37, 99, 235, 0.1)';
        setTimeout(() => {
            element.style.background = '';
        }, 300);
    }
    
    // Budget slider value display
    const budgetInput = document.getElementById('budget');
    if (budgetInput) {
        const display = document.createElement('span');
        display.className = 'budget-display';
        display.style.fontWeight = 'bold';
        display.style.color = 'var(--primary)';
        budgetInput.parentElement.appendChild(display);
        
        function updateBudgetDisplay() {
            const value = budgetInput.value;
            display.textContent = value ? ` $${value}` : ' Not specified';
        }
        
        budgetInput.addEventListener('input', updateBudgetDisplay);
        updateBudgetDisplay();
    }
    
});