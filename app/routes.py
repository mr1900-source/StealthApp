"""HTTP routes for the QuickTrip itinerary app."""
from flask import Blueprint, render_template, request, redirect, url_for, flash
from .itinerary import generate_itinerary, ItineraryError
from .storage import (
    save_itinerary, 
    load_all_itineraries, 
    get_itinerary_by_id,
    delete_itinerary,
    StorageError
)


main_bp = Blueprint('main', __name__, template_folder='templates')

# Displays home page
@main_bp.route('/', methods=['GET'])
def index():
    """Display the main page with itinerary generation form."""
    return render_template('index.html')

# Generates new AI itinerary from user input, used inspiration from Claude  for help
@main_bp.route('/plan', methods=['POST'])
def plan():
    """Generate an itinerary based on user prompt."""
    prompt = request.form.get('prompt', '').strip()
    
    if not prompt:
        flash('Please enter a prompt describing the itinerary you want.', 'warning')
        return redirect(url_for('main.index'))

    try:
        itinerary_text = generate_itinerary(prompt)
    except ItineraryError as e:
        flash(f'Error generating itinerary: {e}', 'danger')
        return redirect(url_for('main.index'))

    return render_template('index.html', prompt=prompt, itinerary=itinerary_text)

# Display's user's manually edited itinerary
@main_bp.route('/modify', methods=['POST'])
def modify():
    """Display modified itinerary after user edits."""
    prompt = request.form.get('prompt', '').strip()
    modified_itinerary = request.form.get('modified_itinerary', '').strip()
    
    if not modified_itinerary:
        flash('No itinerary content to modify.', 'warning')
        return redirect(url_for('main.index'))
    
    flash('Itinerary modified! You can save it below.', 'success')
    return render_template('index.html', prompt=prompt, itinerary=modified_itinerary)

# Saves an itinerary to JSON storage, used help from Claude
@main_bp.route('/save', methods=['POST'])
def save():
    """Save a generated itinerary."""
    title = request.form.get('title', '').strip()
    prompt = request.form.get('prompt', '').strip()
    itinerary_text = request.form.get('itinerary', '').strip()
    
    if not title:
        flash('Please provide a title for your itinerary.', 'warning')
        return redirect(url_for('main.index'))
    
    if not itinerary_text:
        flash('No itinerary to save.', 'danger')
        return redirect(url_for('main.index'))
    
    try:
        save_itinerary(title, prompt, itinerary_text)
        flash(f'Itinerary "{title}" saved successfully!', 'success')
    except StorageError as e:
        flash(f'Error saving itinerary: {e}', 'danger')
    
    return redirect(url_for('main.saved'))

# Shows all saved itineraries
@main_bp.route('/saved', methods=['GET'])
def saved():
    """Display all saved itineraries."""
    try:
        itineraries = load_all_itineraries()
    except StorageError as e:
        flash(f'Error loading itineraries: {e}', 'danger')
        itineraries = []
    
    return render_template('saved.html', itineraries=itineraries)

# Displays full details of one itinerary after user selects
@main_bp.route('/view/<int:itinerary_id>', methods=['GET'])
def view(itinerary_id):
    """View a specific saved itinerary."""
    try:
        itinerary_data = get_itinerary_by_id(itinerary_id)
        if not itinerary_data:
            flash('Itinerary not found.', 'warning')
            return redirect(url_for('main.saved'))
        
        return render_template('view.html', itinerary_data=itinerary_data)
    except StorageError as e:
        flash(f'Error loading itinerary: {e}', 'danger')
        return redirect(url_for('main.saved'))

# Permenantly deletes a saved itinerary
@main_bp.route('/delete/<int:itinerary_id>', methods=['POST'])
def delete(itinerary_id):
    """Delete a saved itinerary."""
    try:
        if delete_itinerary(itinerary_id):
            flash('Itinerary deleted successfully.', 'success')
        else:
            flash('Itinerary not found.', 'warning')
    except StorageError as e:
        flash(f'Error deleting itinerary: {e}', 'danger')
    
    return redirect(url_for('main.saved'))

# Creates a brand new itinerary using the saved prompt in JSON
@main_bp.route('/regenerate/<int:itinerary_id>', methods=['POST'])
def regenerate(itinerary_id):
    """Regenerate an itinerary from a saved prompt."""
    try:
        itinerary_data = get_itinerary_by_id(itinerary_id)
        if not itinerary_data:
            flash('Itinerary not found.', 'warning')
            return redirect(url_for('main.saved'))
        
        # Use the saved prompt to generate a new itinerary
        prompt = itinerary_data['prompt']
        itinerary_text = generate_itinerary(prompt)
        
        return render_template('index.html', prompt=prompt, itinerary=itinerary_text)
        
    except (StorageError, ItineraryError) as e:
        flash(f'Error regenerating itinerary: {e}', 'danger')
        return redirect(url_for('main.saved'))