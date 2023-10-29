const clientId = '9f4c06dcbc5f42dfac632c2d9b02db36';
const redirectUri = 'https://playlistmanager.ddns.net/';
let accessToken;
let selectedPlaylists = [];
let currentPlaylistTracks = [{}, {}];

function login() {
    const scopes = [
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-private',
        'playlist-modify-public',
        'user-library-read',
        'user-library-modify'
    ];
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes.join(' '))}`;
    window.location = authUrl;
}

// Function to retrieve user's playlists using Spotify API
async function fetchPlaylists() {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const data = await response.json();
    
    const container = document.getElementById('playlist-container');
    container.innerHTML = '';

    displayPlaylists(data.items);
    document.getElementById('confirm-button').style.display = 'block';
}

function displayPlaylists(playlists) {
    const container = document.getElementById('playlist-container');
    playlists.forEach(playlist => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = `
            <img src="${playlist.images[0].url}" alt="${playlist.name}" class="playlist-image" />
            <div class="playlist-title">${playlist.name}</div>
        `;
        card.addEventListener('click', () => toggleSelection(playlist, card)); //click event listener to toggle selection of playlists
        container.appendChild(card);
    });
}

function toggleSelection(playlist, card) {
    if (selectedPlaylists.includes(playlist)) {
        selectedPlaylists = selectedPlaylists.filter(item => item !== playlist);
        card.classList.remove('selected');
    } else {
        if (selectedPlaylists.length < 2) { // Limit to 2 playlists
            selectedPlaylists.push(playlist);
            card.classList.add('selected');
        } else {
            alert('You can only select up to 2 playlists.');
        }
    }
}

function confirmSelection() {
    if (selectedPlaylists.length === 2) {
        document.getElementById('playlist-1-title').textContent = selectedPlaylists[0].name;
        document.getElementById('playlist-2-title').textContent = selectedPlaylists[1].name;
        displayTracks();
    } else {
        alert('Please select exactly 2 playlists.');
    }
}
function displayTracks() {
    document.getElementById('tracks-container').style.display = 'flex';
    document.getElementById('confirm-button').style.display = 'none';
    document.getElementById('update-button').style.display = 'block';
    fetchTracks(selectedPlaylists[0].id, 0);
    fetchTracks(selectedPlaylists[1].id, 1);
}

async function fetchTracks(playlistId, index) {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const data = await response.json();
    currentPlaylistTracks[index] = data.items;
    renderTracks(data.items, index);
}

function renderTracks(tracks, index) {
    const container = document.getElementById(`playlist-${index + 1}`);
    container.innerHTML = '';
    tracks.forEach(track => {
        const item = document.createElement('div');
        item.className = 'track-item';
        item.draggable = true;
        item.innerHTML = `
            <img src="${track.track.album.images[0].url}" alt="${track.track.name}" class="track-image" />
            <div class="track-info">
                <div>${track.track.name}</div>
                <div>${track.track.artists.map(artist => artist.name).join(', ')}</div>
            </div>
        `;

        if (track.track.preview_url) {
            const audio = new Audio(track.track.preview_url);
            item.addEventListener('mouseover', () => audio.play());
            item.addEventListener('mouseout', () => audio.pause());
            item.addEventListener('dragstart', (e) => handleDragStart(e, track, index, audio));
        } else { 
            let tooltip;   // Showing tooltip if no track preview is available
            item.addEventListener('mouseover', (e) => {  
                tooltip = document.createElement('div');
                tooltip.className = 'no-preview-tooltip';
                tooltip.textContent = 'No Preview';
                tooltip.style.left = `${e.clientX}px`;
                tooltip.style.top = `${e.clientY}px`;
                document.body.appendChild(tooltip);
            });
            item.addEventListener('mouseout', () => {
                document.body.removeChild(tooltip);
            });
            item.addEventListener('mousemove', (e) => {
                if (tooltip) {
                    tooltip.style.left = `${e.clientX}px`;
                    tooltip.style.top = `${e.clientY}px`;
                }
            });
            item.addEventListener('dragstart', (e) => handleDragStart(e, track, index));
            
        }
        
        container.appendChild(item);
    });
}

let draggedElement;

function handleDragStart(e, track, index, audio) {
    draggedTrack = track;
    sourceIndex = index;
    draggedElement = e.target;
    audio.pause();  // Pause audio when dragging starts
    e.dataTransfer.effectAllowed = 'move';
    draggedElement.classList.add('wiggling');
    console.log(`Dragging "${track.track.name}" from Playlist ${index + 1}`);
}

function handleDrop(e, index) {
    e.preventDefault();
    if (sourceIndex !== index) {
        currentPlaylistTracks[sourceIndex] = currentPlaylistTracks[sourceIndex].filter(track => track !== draggedTrack);
        currentPlaylistTracks[index].push(draggedTrack);
        renderTracks(currentPlaylistTracks[0], 0);
        renderTracks(currentPlaylistTracks[1], 1);
        console.log(`Dropped "${draggedTrack.track.name}" to Playlist ${index + 1}`);
    }
    if (draggedElement) {
        draggedElement.classList.remove('wiggling');
    }
}

document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.getElementById('playlist-1').addEventListener('drop', (e) => handleDrop(e, 0));
document.getElementById('playlist-2').addEventListener('drop', (e) => handleDrop(e, 1));

function handleDrop(e, index) {
    e.preventDefault();
    if (sourceIndex !== index) {
        currentPlaylistTracks[sourceIndex] = currentPlaylistTracks[sourceIndex].filter(track => track !== draggedTrack);
        currentPlaylistTracks[index].push(draggedTrack);
        renderTracks(currentPlaylistTracks[0], 0);
        renderTracks(currentPlaylistTracks[1], 1);
        console.log(`Dropped "${draggedTrack.track.name}" to Playlist ${index + 1}`);
    }
}

async function updatePlaylists() {
    const playlistsToUpdate = [
        { id: selectedPlaylists[0].id, index: 0 },
        { id: selectedPlaylists[1].id, index: 1 }
    ];

    for (const playlist of playlistsToUpdate) {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        console.log(`Original tracks for Playlist ${playlist.index + 1}:`, data.items);

        const originalUris = data.items.map(track => track.track.uri);
        const currentUris = currentPlaylistTracks[playlist.index].map(track => track.track.uri);

        console.log(`Current tracks for Playlist ${playlist.index + 1}:`, currentUris);

        const urisToAdd = currentUris.filter(uri => !originalUris.includes(uri));
        const urisToRemove = originalUris.filter(uri => !currentUris.includes(uri));

        console.log(`Tracks to add to Playlist ${playlist.index + 1}:`, urisToAdd);
        console.log(`Tracks to remove from Playlist ${playlist.index + 1}:`, urisToRemove);

        if (urisToAdd.length > 0) {
            await addTracksToPlaylist(playlist.id, urisToAdd);
        }
        if (urisToRemove.length > 0) {
            await removeTracksFromPlaylist(playlist.id, urisToRemove);
        }
    }

    alert('Playlists updated successfully');

  
    // Clear selected playlists
    selectedPlaylists = [];

    document.getElementById('tracks-container').style.display = 'none';
    document.getElementById('update-button').style.display = 'none';
    document.getElementById('playlist-container').style.display = 'grid';
    fetchPlaylists();
}

async function addTracksToPlaylist(playlistId, uris) {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?uris=${uris.join(',')}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        const errorData = await response.json();
        console.error(`Failed to add tracks to playlist: ${errorData.error.message}`);
    }
}

async function removeTracksFromPlaylist(playlistId, uris) {
    console.log(`Removing tracks from playlist ${playlistId}:`, uris);

    // Create an array of objects with URIs
    const tracks = uris.map(uri => ({ uri }));

    try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tracks })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Failed to remove tracks from playlist: ${errorData.error.message}`);
        } else {
            console.log('Tracks successfully removed from playlist:', response.status);
        }
    } catch (error) {
        console.error('An error occurred while removing tracks:', error);
    }
}


window.addEventListener('load', () => { 
    const hash = window.location.hash
        .substring(1)
        .split('&')
        .reduce((initial, item) => {
            let parts = item.split('=');
            initial[parts[0]] = decodeURIComponent(parts[1]);
            return initial;
        }, {});
    accessToken = hash.access_token;
    if (accessToken) {  // Hide login if token is present
        document.getElementById('login-container').style.display = 'none'; 
        fetchPlaylists();
    }
});
