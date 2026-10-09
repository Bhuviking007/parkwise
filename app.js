
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme',theme);
  try{localStorage.setItem('parkwise_theme',theme)}catch(e){}
}
document.addEventListener('DOMContentLoaded',()=>{
  const themeToggle=document.getElementById('settingTheme');
  const current=(document.documentElement.getAttribute('data-theme')||'dark');
  if(themeToggle){themeToggle.checked=current==='dark';themeToggle.addEventListener('change',()=>{applyTheme(themeToggle.checked?'dark':'light');toast(themeToggle.checked?'Dark theme enabled':'Light theme enabled')})}
});

const STORE={reports:'parkwise_reports_v1',resolved:'parkwise_resolved_v1',reservations:'parkwise_reservations_v1',settings:'parkwise_settings_v1'};
const initialParking=[
{id:'anna',name:'Anna Nagar Tower Park',area:'Anna Nagar',lat:13.0850,lon:80.2101,distance:'0.8 km',kind:'Open parking',spots:42,total:60,icon:'🅿️',status:'Available',price:'₹20 / hour'},
{id:'egmore',name:'Egmore Metro Parking',area:'Egmore',lat:13.0780,lon:80.2610,distance:'1.2 km',kind:'Covered parking',spots:8,total:48,icon:'🚘',status:'Filling fast',price:'₹30 / hour'},
{id:'mylapore',name:'Mylapore Tank Road',area:'Mylapore',lat:13.0336,lon:80.2674,distance:'2.1 km',kind:'Street parking',spots:31,total:44,icon:'🅿️',status:'Available',price:'₹15 / hour'},
{id:'tnagar',name:'T. Nagar · Pondy Bazaar',area:'T. Nagar',lat:13.0418,lon:80.2341,distance:'2.7 km',kind:'Multi-level',spots:4,total:90,icon:'🚗',status:'Almost full',price:'₹40 / hour'},
{id:'kilpauk',name:'Kilpauk Garden Parking',area:'Kilpauk',lat:13.0827,lon:80.2370,distance:'3.2 km',kind:'Open parking',spots:26,total:45,icon:'🅿️',status:'Available',price:'₹20 / hour'},
{id:'marina',name:'Marina Beach North Lot',area:'Marina',lat:13.0644,lon:80.2836,distance:'4.1 km',kind:'Open parking',spots:57,total:100,icon:'🚙',status:'Available',price:'₹25 / hour'}
];
const initialViolations=[
{id:'v1',plate:'TN 09 AB 4821',location:'Mount Road',issue:'Illegal parking',time:'10:42 AM',status:'Review',icon:'🚙'},
{id:'v2',plate:'TN 10 CD 1906',location:'T. Nagar',issue:'Road obstruction',time:'10:18 AM',status:'Pending',icon:'🚗'},
{id:'v3',plate:'TN 07 EF 7732',location:'Egmore',issue:'No-parking zone',time:'09:56 AM',status:'Review',icon:'🚐'},
{id:'v4',plate:'TN 22 GH 4430',location:'Anna Salai',issue:'Blocked accessible bay',time:'09:21 AM',status:'Pending',icon:'🚗'},
{id:'v5',plate:'TN 11 JK 2881',location:'Mylapore',issue:'Double parking',time:'Yesterday',status:'Resolved',icon:'🚘'}
];
function read(key,fallback){try{const val=localStorage.getItem(key);return val?JSON.parse(val):fallback}catch(e){return fallback}}
function write(key,val){try{localStorage.setItem(key,JSON.stringify(val))}catch(e){}}
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let toastTimer;
function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3000)}
function getParking(){const reservations=read(STORE.reservations,{});return initialParking.map(p=>({...p,spots:Math.max(0,p.spots-(reservations[p.id]||0))})).map(p=>({...p,status:p.spots===0?'Full':p.spots<=5?'Almost full':p.spots<=10?'Filling fast':'Available'}))}
function getViolations(){const resolved=read(STORE.resolved,[]);return initialViolations.map(v=>resolved.includes(v.id)?{...v,status:'Resolved'}:v)}
function markResolved(id){const arr=read(STORE.resolved,[]);if(!arr.includes(id))arr.push(id);write(STORE.resolved,arr);renderViolations();updateStats();toast('Alert marked as resolved.')}
function updateStats(){const unresolved=getViolations().filter(v=>v.status!=='Resolved').length;const r=read(STORE.reports,[]);const p=getParking().reduce((n,x)=>n+x.spots,0);document.querySelectorAll('[data-stat="spots"]').forEach(n=>n.textContent=p);document.querySelectorAll('[data-stat="violations"]').forEach(n=>n.textContent=String(unresolved).padStart(2,'0'));document.querySelectorAll('[data-stat="reports"]').forEach(n=>n.textContent=36+r.length)}
function statusClass(s){return s==='Resolved'?'pill':s==='Review'?'pill danger':s==='Pending'?'pill warn':s==='Almost full'?'pill danger':s==='Filling fast'?'pill warn':'pill'}
function renderViolations(filter='All'){const tbody=document.getElementById('violationRows');if(!tbody)return;const data=getViolations().filter(v=>filter==='All'||v.status===filter);tbody.innerHTML=data.map(v=>`<tr><td><div class="vehicle"><span class="vehicle-icon">${v.icon}</span><span>${escapeHTML(v.plate)}<small style="display:block;color:#89938c;font-weight:400;margin-top:3px">${escapeHTML(v.location)}</small></span></div></td><td>${escapeHTML(v.issue)}</td><td>${escapeHTML(v.time)}</td><td><span class="${statusClass(v.status)}">${escapeHTML(v.status)}</span></td><td>${v.status==='Resolved'?'<span style="color:#89938c">Done</span>':`<button class="text-btn" data-resolve="${v.id}">Resolve</button>`}</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:#89938c;padding:24px">No alerts match this filter.</td></tr>';tbody.querySelectorAll('[data-resolve]').forEach(b=>b.addEventListener('click',()=>markResolved(b.dataset.resolve)));}
function haversineKm(lat1,lon1,lat2,lon2){const rad=x=>x*Math.PI/180;const dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function renderParking(){
 const list=document.getElementById('parkingCards');if(!list)return;
 const q=(document.getElementById('parkingSearch')?.value||'').toLowerCase().trim();
 const active=document.querySelector('[data-park-filter].active')?.dataset.parkFilter||'All';
 const type=document.getElementById('parkingTypeFilter')?.value||'all';
 const sort=document.getElementById('parkingSort')?.value||'near';
 const radius=document.getElementById('parkingRadius')?.value||'all';
 const all=getParking();
 const origin=window._parkwiseOrigin||null;
 let rows=all.filter(p=>(active==='All'||(active==='Available'&&p.spots>10)||(active==='Filling fast'&&p.spots>0&&p.spots<=10)||(active==='Full'&&p.spots===0))&&(type==='all'||p.kind===type)&&(`${p.name} ${p.area} ${p.kind}`.toLowerCase().includes(q)));
 rows=rows.map(p=>({...p,_distance:(origin&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon)))?haversineKm(origin.lat,origin.lon,Number(p.lat),Number(p.lon)):null}));
 if(radius!=='all'){if(origin){rows=rows.filter(p=>p._distance!==null&&p._distance<=Number(radius));}else if(document.getElementById('parkingLocationHint')){document.getElementById('parkingLocationHint').textContent='Select “Use Current Location” first to filter by distance. Showing all matching demo locations for now.';}}
 if(sort==='near'&&origin)rows.sort((a,b)=>(a._distance??Infinity)-(b._distance??Infinity));
 else if(sort==='available')rows.sort((a,b)=>b.spots-a.spots);
 else if(sort==='name')rows.sort((a,b)=>a.name.localeCompare(b.name));
 const hint=document.getElementById('parkingLocationHint');
 if(hint&&!(radius!=='all'&&!origin))hint.textContent=origin?`Sorted from your last selected location. Distances are straight-line estimates; demo spots, prices and availability are not live.`:'Use “Use Current Location” above to calculate distance and sort nearby demo locations. Demo spots, prices and availability are not live.';
 list.innerHTML=rows.map(p=>{
   const directions='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(p.lat!=null&&p.lon!=null?`${p.lat},${p.lon}`:`${p.name}, ${p.area}`);
   const distance=p._distance===null?'Distance unavailable':`${p._distance.toFixed(1)} km away (approx.)`;
   return `<article class="parking-card"><div class="parking-card-top"><div class="card-symbol">${p.icon}</div><span class="${statusClass(p.status)}">${escapeHTML(p.status)}</span></div><h3>${escapeHTML(p.name)}</h3><div class="parking-meta">⌖ ${escapeHTML(p.area)}<br>↗ ${distance}<br>▤ ${escapeHTML(p.kind)} · ${escapeHTML(p.price)}<br>◷ ${p.spots>0?'Demo spaces listed':'No demo spaces listed'}</div><div class="parking-card-bottom"><div class="spots"><strong>${String(p.spots).padStart(2,'0')} <small style="font:500 10px 'DM Sans';letter-spacing:0;color:#75817b">spots left*</small></strong><small>${p.total} spaces in this demo zone</small></div><div class="parking-card-actions"><a class="secondary-btn" href="${directions}" target="_blank" rel="noopener">Directions ↗</a><button class="${p.spots?'primary-btn':'secondary-btn'}" data-reserve="${p.id}" ${p.spots===0?'disabled':''}>${p.spots?'Reserve demo spot':'Full'}</button></div></div><div class="sub parking-disclaimer">*Illustrative demo data; not a confirmed real-world vacancy.</div></article>`;
 }).join('')||'<div class="empty-state">No parking zones match these filters. Try a larger distance or different parking type.</div>';
 list.querySelectorAll('[data-reserve]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.reserve;const reservations=read(STORE.reservations,{});const activeCount=Object.values(reservations).reduce((sum,n)=>sum+Math.max(0,Number(n)||0),0);if(activeCount>=1){toast('You already have an active demo reservation.');return;}const current=getParking().find(p=>p.id===id);if(!current||current.spots<1){toast('This demo location has no listed spaces left.');return;}reservations[id]=(reservations[id]||0)+1;write(STORE.reservations,reservations);renderParking();updateStats();toast('Demo reservation added. No real parking space was booked.');}));
}
function renderCitizenReports(){const list=document.getElementById('citizenReportList');if(!list)return;const reports=read(STORE.reports,[]);const items=reports.slice().reverse().concat([{type:'Road obstruction',location:'Near T. Nagar bus stop',details:'Vehicle partly blocking the pedestrian crossing.',priority:'Urgent',created:'Today, 10:18 AM',id:'sample1',sample:true},{type:'Damaged parking sign',location:'Anna Nagar 2nd Avenue',details:'The street parking restriction sign is difficult to read.',priority:'Normal',created:'Today, 9:35 AM',id:'sample2',sample:true}]);list.innerHTML=items.map(r=>`<div class="report-item"><div class="report-symbol">${r.type.includes('parking')?'🅿️':'📍'}</div><div class="report-item-body"><strong>${escapeHTML(r.type)}</strong><p>${escapeHTML(r.location)}${r.details?' — '+escapeHTML(r.details):''}</p><div class="report-item-meta"><span>${escapeHTML(r.created||'Just now')}</span><span>·</span><span>${escapeHTML(r.priority||'Normal')} priority</span><span class="pill ${r.priority==='Urgent'?'warn':''}" style="margin-left:auto">${r.sample?'Under review':'Submitted'}</span></div></div></div>`).join('')}
function setupSearch(){const search=document.getElementById('globalSearch');if(search){search.addEventListener('keydown',e=>{if(e.key==='Enter'){const val=search.value.trim();const target=document.body.dataset.page==='parking'?document.getElementById('parkingSearch'):null;if(target){target.value=val;renderParking()}else{location.href='parking.html?q='+encodeURIComponent(val)}}})}}
function setupShell(){const side=document.getElementById('sidebar');document.getElementById('menuBtn')?.addEventListener('click',()=>side?.classList.toggle('open'));document.getElementById('notificationBtn')?.addEventListener('click',()=>toast(`${getViolations().filter(v=>v.status!=='Resolved').length} active violation alerts are awaiting review.`));document.getElementById('helpBtn')?.addEventListener('click',()=>toast('Parkwise is a demo prototype. Use Citizen Reports to log a street issue.'));document.getElementById('settingsBtn')?.addEventListener('click',()=>location.href='settings.html');document.getElementById('findSpotBtn')?.addEventListener('click',()=>location.href='parking.html');document.getElementById('viewViolationsBtn')?.addEventListener('click',()=>location.href='violations.html');document.getElementById('allParkingBtn')?.addEventListener('click',()=>location.href='parking.html');document.getElementById('newReportBtn')?.addEventListener('click',()=>location.href='reports.html');setupSearch();updateStats()}
function setupDashboard(){const rows=document.getElementById('dashboardViolations');if(rows){const old=rows.innerHTML;rows.innerHTML='';getViolations().filter(v=>v.status!=='Resolved').slice(0,3).forEach(v=>{rows.insertAdjacentHTML('beforeend',`<tr><td><div class="vehicle"><span class="vehicle-icon">${v.icon}</span><span>${escapeHTML(v.plate)}<small style="display:block;color:#89938c;font-weight:400;margin-top:3px">${escapeHTML(v.location)}</small></span></div></td><td>${escapeHTML(v.issue)}</td><td>${escapeHTML(v.time)}</td><td><span class="${statusClass(v.status)}">${escapeHTML(v.status)}</span></td></tr>`)})}const list=document.getElementById('dashboardParking');if(list){list.innerHTML='';getParking().slice(0,4).forEach(p=>list.insertAdjacentHTML('beforeend',`<div class="parking-row"><div class="parking-icon">${p.icon}</div><div class="parking-info"><strong>${escapeHTML(p.name)}</strong><small>${p.distance} · ${escapeHTML(p.kind)}</small></div><div class="availability"><strong>${String(p.spots).padStart(2,'0')} <span style="font-size:10px;color:#89938c">spots</span></strong><span class="${statusClass(p.status)}">${p.status}</span></div></div>`))}}
function setupViolationFilters(){document.querySelectorAll('[data-violation-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-violation-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderViolations(b.dataset.violationFilter)}));renderViolations()}

let parkwiseMap=null;
let googleMapFrame=null;
let currentMapProvider='osm';
const demoMapSpots=[
 {id:'anna',name:'Anna Nagar Tower Park',lat:13.0850,lon:80.2101,spots:42,kind:'Open parking'},
 {id:'egmore',name:'Egmore Metro Parking',lat:13.0732,lon:80.2609,spots:8,kind:'Covered parking'},
 {id:'mylapore',name:'Mylapore Tank Road',lat:13.0338,lon:80.2676,spots:31,kind:'Street parking'},
 {id:'tnagar',name:'T. Nagar · Pondy Bazaar',lat:13.0418,lon:80.2341,spots:4,kind:'Multi-level'},
 {id:'kilpauk',name:'Kilpauk Garden Parking',lat:13.0836,lon:80.2410,spots:26,kind:'Open parking'},
 {id:'marina',name:'Marina Beach North Lot',lat:13.0645,lon:80.2830,spots:57,kind:'Open parking'}
];
function mapStatus(message,kind='info'){const el=document.getElementById('osmStatus');if(!el)return;el.textContent=message;el.style.background=kind==='error'?'#fff0ed':'';el.style.borderColor=kind==='error'?'#f0c4bc':'';el.style.color=kind==='error'?'#98463d':'';}
function addDemoParkingMarkers(show){if(!parkwiseMap)return;if(parkwiseMap._demoMarkers){parkwiseMap._demoMarkers.forEach(m=>parkwiseMap.removeLayer(m))}parkwiseMap._demoMarkers=[];if(!show)return;const reservations=read(STORE.reservations,{});demoMapSpots.forEach(p=>{const current=Math.max(0,p.spots-(Number(reservations[p.id])||0));const marker=L.marker([p.lat,p.lon]).addTo(parkwiseMap);marker.bindPopup(`<strong>${escapeHTML(p.name)}</strong><br>${escapeHTML(p.kind)}<br><b>${current}</b> illustrative spots remaining<br><small>Demo location · not a real-time availability feed</small>`);parkwiseMap._demoMarkers.push(marker)});}
function initParkwiseMap(){const node=document.getElementById('parkwiseMap');if(!node)return;if(!window.L){mapStatus('The map library could not load. Check your internet connection and refresh.','error');return}if(parkwiseMap)return;parkwiseMap=L.map(node,{scrollWheelZoom:false}).setView([13.0827,80.2707],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(parkwiseMap);addDemoParkingMarkers(true);setTimeout(()=>parkwiseMap.invalidateSize(),150);}
function googleMapUrl(place){return 'https://maps.google.com/maps?q='+encodeURIComponent(place||'Chennai, Tamil Nadu, India')+'&z=13&output=embed';}
function centerOnCoordinates(lat,lon,label='Your current location'){window._parkwiseOrigin={lat:Number(lat),lon:Number(lon)};renderParking();const input=document.getElementById('osmPlace');if(input)input.value=label; if(currentMapProvider==='google'){if(!googleMapFrame)renderMapProvider('google',`${lat},${lon}`);else googleMapFrame.src=googleMapUrl(`${lat},${lon}`);mapStatus('Google Maps centered on your current location.');return;}if(!parkwiseMap)initParkwiseMap();if(!parkwiseMap)return;parkwiseMap.setView([lat,lon],16,{animate:true});if(window._parkwiseUserMarker)parkwiseMap.removeLayer(window._parkwiseUserMarker);window._parkwiseUserMarker=L.circleMarker([lat,lon],{radius:9,color:'#fff',weight:3,fillColor:'#3478f6',fillOpacity:1}).addTo(parkwiseMap).bindPopup('<strong>Your current location</strong><br><small>Location supplied by your device</small>').openPopup();mapStatus('Map centered on your current location. Blue marker shows your device location; parking availability is not verified.');}
function useCurrentLocation(){if(!navigator.geolocation){mapStatus('Your browser does not support location access. Try searching for a place instead.','error');return;}mapStatus('Requesting your current location…');navigator.geolocation.getCurrentPosition(pos=>{centerOnCoordinates(pos.coords.latitude,pos.coords.longitude);},err=>{const msg=err.code===1?'Location permission was denied. Allow location access in your browser and try again.':err.code===2?'Your location could not be determined. Check device location services and try again.':'Location request timed out. Try again or search for a place.';mapStatus(msg,'error');},{enableHighAccuracy:true,timeout:15000,maximumAge:60000});}
function renderMapProvider(provider,place){
 const host=document.getElementById('mapHost');if(!host)return;
 currentMapProvider=provider==='google'?'google':'osm';
 const mapNode=document.getElementById('parkwiseMap');const legend=document.getElementById('mapLegend');const attribution=document.getElementById('mapAttribution');
 if(currentMapProvider==='google'){
  if(mapNode)mapNode.style.display='none';
  if(!googleMapFrame){googleMapFrame=document.createElement('iframe');googleMapFrame.id='googleMapFrame';googleMapFrame.className='parkwise-map google-map-frame';googleMapFrame.title='Google Maps';googleMapFrame.loading='lazy';googleMapFrame.referrerPolicy='no-referrer-when-downgrade';googleMapFrame.allowFullscreen=true;host.appendChild(googleMapFrame)}
  googleMapFrame.style.display='block';googleMapFrame.src=googleMapUrl(place||document.getElementById('osmPlace')?.value||'Chennai, Tamil Nadu, India');
  if(legend)legend.style.display='none';if(attribution)attribution.innerHTML='Map provided by <a href="https://maps.google.com/" target="_blank" rel="noopener">Google Maps</a>. Parking availability is not verified by this map.';
  mapStatus('Google Maps view selected. Search above to move the map. Google Maps is displayed separately from Parkwise demo reservations.');
 }else{
  if(googleMapFrame)googleMapFrame.style.display='none';if(mapNode)mapNode.style.display='block';
  if(legend)legend.style.display='flex';if(attribution)attribution.innerHTML='Map data © OpenStreetMap contributors · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Attribution and tile usage policy</a>';
  initParkwiseMap();if(parkwiseMap)setTimeout(()=>parkwiseMap.invalidateSize(),100);
  mapStatus('OpenStreetMap view selected. Green pins around Chennai are illustrative Parkwise demo locations; counts are not live.');
  if(place)searchOnlineParking(place);
 }
}
async function searchOnlineParking(place){
 const input=document.getElementById('osmPlace');if(!input)return;
 if(currentMapProvider==='google'){
  if(!googleMapFrame)renderMapProvider('google',place);else googleMapFrame.src=googleMapUrl(place);
  mapStatus('Google Maps centered on '+place+'. Map results are supplied by Google; live parking availability is not guaranteed.');return;
 }
 if(!parkwiseMap)initParkwiseMap();if(!parkwiseMap)return;
 mapStatus('Finding “'+place+'”…');
 try{
  const response=await fetch('/api/geocode?q='+encodeURIComponent(place+', India'),{headers:{'Accept':'application/json'}});
  if(!response.ok){let msg='Geocoding service returned HTTP '+response.status;try{msg=(await response.json()).error||msg}catch(e){}throw new Error(msg)}
  const result=await response.json();const lat=Number(result.lat),lon=Number(result.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('The location service returned invalid coordinates.');
  parkwiseMap.setView([lat,lon],13,{animate:true});
  const isChennai=/chennai/i.test(place)||/chennai/i.test(result.display_name||'');
  addDemoParkingMarkers(isChennai);
  L.circleMarker([lat,lon],{radius:8,color:'#fff',weight:3,fillColor:'#3478f6',fillOpacity:1}).addTo(parkwiseMap).bindPopup(`<strong>${escapeHTML(result.display_name||place)}</strong><br>Search location`).openPopup();
  mapStatus('Map centered on '+(result.display_name||place)+'. '+(isChennai?'Green pins show illustrative Parkwise demo parking locations; their counts are not live.':'No demo parking pins are shown for this area. The underlying map is real, but this prototype has no verified local availability feed.'));
 }catch(e){mapStatus((e&&e.message?e.message:'Could not find this location.')+' The online map remains available; try a simpler place name.','error')}
}
function setupOnlineParking(){const form=document.getElementById('osmSearchForm'),input=document.getElementById('osmPlace'),selector=document.getElementById('mapProvider');if(!form||!input||!selector)return;let saved='osm';try{saved=localStorage.getItem('parkwise_map_provider')||'osm'}catch(e){}selector.value=saved;renderMapProvider(saved);form.addEventListener('submit',e=>{e.preventDefault();const place=input.value.trim();if(!place){toast('Enter a city, area or landmark first.');return}searchOnlineParking(place)});document.getElementById('currentLocationBtn')?.addEventListener('click',useCurrentLocation);selector.addEventListener('change',()=>{try{localStorage.setItem('parkwise_map_provider',selector.value)}catch(e){}renderMapProvider(selector.value,input.value.trim());});}

function setupParkingPage(){document.querySelectorAll('[data-park-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-park-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderParking()}));document.getElementById('parkingSearch')?.addEventListener('input',renderParking);['parkingTypeFilter','parkingSort','parkingRadius'].forEach(id=>document.getElementById(id)?.addEventListener('change',renderParking));const params=new URLSearchParams(location.search);const q=params.get('q');if(q&&document.getElementById('parkingSearch'))document.getElementById('parkingSearch').value=q;renderParking()}
function setupReportForm(){const form=document.getElementById('reportForm');if(!form)return;form.addEventListener('submit',e=>{e.preventDefault();const type=document.getElementById('reportType').value,locationValue=document.getElementById('reportLocation').value.trim();if(!type||!locationValue){toast('Please choose an issue and add a location.');return}const reports=read(STORE.reports,[]);reports.push({id:'r'+Date.now(),type,location:locationValue,vehicle:document.getElementById('reportVehicle').value.trim(),priority:document.getElementById('reportPriority').value,details:document.getElementById('reportDetails').value.trim(),created:'Just now'});write(STORE.reports,reports);form.reset();renderCitizenReports();updateStats();toast('Report added to this demo. Thanks for helping your community!')});renderCitizenReports()}
function setupSettings(){const form=document.getElementById('settingsForm');if(!form)return;const settings=read(STORE.settings,{notifications:true,compact:false});document.getElementById('settingNotifications').checked=!!settings.notifications;document.getElementById('settingCompact').checked=!!settings.compact;form.addEventListener('submit',e=>{e.preventDefault();write(STORE.settings,{notifications:document.getElementById('settingNotifications').checked,compact:document.getElementById('settingCompact').checked});toast('Your demo preferences have been saved in this browser.')});document.getElementById('clearDemo')?.addEventListener('click',()=>{if(confirm('Clear demo reservations, reports, and resolved alerts from this browser?')){Object.values(STORE).forEach(k=>localStorage.removeItem(k));toast('Demo data cleared. Refreshing this page…');setTimeout(()=>location.reload(),650)}})}
document.addEventListener('DOMContentLoaded',()=>{setupShell();setupDashboard();if(document.body.dataset.page==='parking'){setupParkingPage();setupOnlineParking();}if(document.body.dataset.page==='violations')setupViolationFilters();if(document.body.dataset.page==='reports')setupReportForm();if(document.body.dataset.page==='settings')setupSettings();});
