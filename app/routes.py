"""HTTP routes for the QuickTrip itinerary app."""
from flask import Blueprint, render_template, request, redirect, url_for, flash
from .services import DataAggregator, ItineraryBuilder
from .itinerary import ItineraryError
from .storage import (
    save_itinerary, 
    load_all_itineraries, 
    get_itinerary_by_id,
    delete_itinerary,
    StorageError
)
from .utils import parse_budget, extract_interests_list


main_bp = Blueprint('main', __name__, template_folder='templates')


@main_bp.route('/', methods=['GET'])
def index():
    """Display the main page with itinerary generation form."""
    return render_template('index.html')


@main_bp.route('/plan', methods=['POST'])
def plan():
    """Generate an itinerary using real-time data and AI."""
    # Collect form data
    destination = request.form.get('destination', '').strip()
    duration = request.form.get('duration', '').strip()
    travelers = request.form.get('travelers', '').strip()
    budget = request.form.get('budget', '').strip()
    start_time = request.form.get('start_time', '').strip()
    pace = request.form.get('pace', '').strip()
    interests = request.form.get('interests', '').strip()
    special_requirements = request.form.get('special_requirements', '').strip()
    
    # Validate required fields
    if not destination or not duration:
        flash('Please provide at least a destination and duration.', 'warning')
        return redirect(url_for('main.index'))
    
    # Build user request dictionary
    user_request = {
        "destination": destination,
        "duration": duration,
        "travelers": travelers,
        "budget": budget,
        "start_time": start_time,
        "pace": pace,
        "interests": interests,
        "special_requirements": special_requirements
    }
    
    try:
        # Gather real-time data
        aggregator = DataAggregator()
        travel_data = aggregator.gather_travel_data(
            destination=destination,
            interests=extract_interests_list(interests),
            budget=parse_budget(budget),
            duration=duration
        )
        
        # Check if we got any data
        if travel_data["metadata"]["total_results"] == 0:
            flash(
                f'Could not find enough information for {destination}. '
                'Try a major city or check your API keys.',
                'warning'
            )
            return redirect(url_for('main.index'))
        
        # Build itinerary with AI
        builder = ItineraryBuilder()
        itinerary_text = builder.build_itinerary(user_request, travel_data)
        
        # Build prompt for display (simplified version)
        full_prompt = f"{destination} - {duration}"
        if interests:
            full_prompt += f" - Interests: {interests}"
        
        # Store form data to repopulate form
        form_data = user_request
        
        flash(
            f'Itinerary created using {len(travel_data["metadata"]["sources_used"])} real-time data sources!',
            'success'
        )
        
        return render_template('index.html', 
                             prompt=full_prompt, 
                             itinerary=itinerary_text,
                             form_data=form_data,
                             data_sources=travel_data["metadata"]["sources_used"])
        
    except ItineraryError as e:
        flash(f'Error generating itinerary: {e}', 'danger')
        return redirect(url_for('main.index'))
    except Exception as e:
        flash(f'Unexpected error: {e}', 'danger')
        return redirect(url_for('main.index'))


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


@main_bp.route('/saved', methods=['GET'])
def saved():
    """Display all saved itineraries."""
    try:
        itineraries = load_all_itineraries()
    except StorageError as e:
        flash(f'Error loading itineraries: {e}', 'danger')
        itineraries = []
    
    return render_template('saved.html', itineraries=itineraries)


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


@main_bp.route('/regenerate/<int:itinerary_id>', methods=['POST'])
def regenerate(itinerary_id):
    """Regenerate an itinerary from a saved prompt."""
    try:
        itinerary_data = get_itinerary_by_id(itinerary_id)
        if not itinerary_data:
            flash('Itinerary not found.', 'warning')
            return redirect(url_for('main.saved'))
        
        # Parse the original prompt to extract parameters
        prompt = itinerary_data['prompt']
        
        # For now, just use basic regeneration
        # TODO: Could parse prompt to extract original parameters
        flash('Regeneration from saved itineraries coming soon! Please create a new one for now.', 'info')
        return redirect(url_for('main.index'))
        
    except (StorageError, ItineraryError) as e:
        flash(f'Error regenerating itinerary: {e}', 'danger')
        return redirect(url_for('main.saved'))