document.addEventListener('DOMContentLoaded', () => {
    // --- Simulação de Banco de Dados (LocalStorage seria melhor para persistência) ---
    let vehicles = JSON.parse(localStorage.getItem('vehicles')) || [];
    let maintenanceRecords = JSON.parse(localStorage.getItem('maintenanceRecords')) || [];
    let nextVehicleId = vehicles.length > 0 ? Math.max(...vehicles.map(v => v.id)) + 1 : 1;
    let nextMaintId = maintenanceRecords.length > 0 ? Math.max(...maintenanceRecords.map(m => m.id)) + 1 : 1;
    let currentDetailVehicleId = null; // Para saber qual veículo está na tela de detalhes

    // --- Elementos do DOM ---
    const sidebarLinks = document.querySelectorAll('#sidebar a[data-target]');
    const contentSections = document.querySelectorAll('.content-section');
    const vehicleListContainer = document.getElementById('vehicle-list');
    const addVehicleForm = document.getElementById('add-vehicle-form');
    const scheduleMaintenanceForm = document.getElementById('schedule-maintenance-form');
    const scheduleVehicleSelect = document.getElementById('schedule-vehicle');
    const vehicleDetailView = document.getElementById('vehicle-detail-view');
    const vehicleDetailsContent = document.getElementById('vehicle-details-content');
    const detailVehicleName = document.getElementById('detail-vehicle-name');
    const maintenanceHistoryList = document.getElementById('maintenance-history-list');
    const addMaintenanceForm = document.getElementById('add-maintenance-form');
    const addMaintenanceBtn = document.getElementById('add-maintenance-entry-btn');
    const cancelAddMaintenanceBtn = document.getElementById('cancel-add-maintenance');
    const maintenanceVehicleIdInput = document.getElementById('maintenance-vehicle-id');

    // --- Funções de Persistência ---
    const saveData = () => {
        localStorage.setItem('vehicles', JSON.stringify(vehicles));
        localStorage.setItem('maintenanceRecords', JSON.stringify(maintenanceRecords));
    };

    // --- Funções de Exibição (Views) ---
    const showView = (targetId) => {
        // Esconde todas as seções
        contentSections.forEach(section => section.classList.remove('active'));
        // Remove a classe 'active' de todos os links da sidebar
        sidebarLinks.forEach(link => link.classList.remove('active'));

        // Mostra a seção alvo
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
            // Adiciona a classe 'active' ao link correspondente na sidebar
            const activeLink = document.querySelector(`#sidebar a[data-target="${targetId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        } else {
            console.error("Target section not found:", targetId);
            // Opcional: Mostrar uma view de erro ou a default (garagem)
            document.getElementById('garage-view').classList.add('active');
            document.querySelector('#sidebar a[data-target="garage-view"]').classList.add('active');
        }
        // Limpa mensagens de erro/sucesso ao trocar de view
        hideError('add-vehicle-error');
        hideError('schedule-error');
        hideSuccess('schedule-success');
        hideError('add-maintenance-error');
    };

    // --- Funções de Renderização ---
    const renderGarage = () => {
        vehicleListContainer.innerHTML = ''; // Limpa a lista atual
        if (vehicles.length === 0) {
            vehicleListContainer.innerHTML = '<p>Nenhum veículo cadastrado ainda.</p>';
            return;
        }

        vehicles.forEach(vehicle => {
            const card = document.createElement('div');
            card.classList.add('vehicle-card');
            card.innerHTML = `
                <h4>${vehicle.make} ${vehicle.model} (${vehicle.year})</h4>
                <p><strong>Placa:</strong> ${vehicle.plate}</p>
                ${vehicle.vin ? `<p><strong>VIN:</strong> ${vehicle.vin}</p>` : ''}
                <div class="actions">
                    <button class="btn btn-primary btn-small view-details" data-id="${vehicle.id}">Ver Detalhes/Histórico</button>
                    <button class="btn btn-success btn-small schedule-maint-quick" data-id="${vehicle.id}">Agendar Manutenção</button>
                    <button class="btn btn-danger btn-small delete-vehicle" data-id="${vehicle.id}">Excluir</button>
                </div>
            `;
            vehicleListContainer.appendChild(card);
        });
    };

    const renderVehicleDetails = (vehicleId) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle) {
            showError('global-message', 'Veículo não encontrado.');
            showView('garage-view'); // Volta para garagem se não achar
            return;
        }
        currentDetailVehicleId = vehicleId; // Armazena ID do veículo em detalhe

        detailVehicleName.textContent = `Detalhes: ${vehicle.make} ${vehicle.model} (${vehicle.year})`;
        vehicleDetailsContent.innerHTML = `
            <p><strong>Marca:</strong> ${vehicle.make}</p>
            <p><strong>Modelo:</strong> ${vehicle.model}</p>
            <p><strong>Ano:</strong> ${vehicle.year}</p>
            <p><strong>Placa:</strong> ${vehicle.plate}</p>
            ${vehicle.vin ? `<p><strong>VIN:</strong> ${vehicle.vin}</p>` : ''}
        `;
        renderMaintenanceHistory(vehicleId);
        maintenanceVehicleIdInput.value = vehicleId; // Preenche ID no form de adicionar manutenção
        addMaintenanceForm.classList.add('hidden'); // Garante que form de add está oculto
        showView('vehicle-detail-view');
    };

     const renderMaintenanceHistory = (vehicleId) => {
        const records = maintenanceRecords.filter(m => m.vehicleId === vehicleId);
        maintenanceHistoryList.innerHTML = ''; // Limpa

        if (records.length === 0) {
            maintenanceHistoryList.innerHTML = '<p>Nenhum histórico de manutenção para este veículo.</p>';
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Serviço</th>
                    <th>Custo (R$)</th>
                    <th>Observações</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${records.map(record => `
                    <tr data-id="${record.id}">
                        <td>${formatDate(record.date)}</td>
                        <td>${escapeHTML(record.service)}</td>
                        <td>${record.cost !== null && record.cost !== undefined ? `R$ ${Number(record.cost).toFixed(2)}` : '-'}</td>
                        <td>${escapeHTML(record.notes)}</td>
                        <td class="maint-actions">
                           <button class="btn btn-danger btn-small delete-maint" data-id="${record.id}">Excluir</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        maintenanceHistoryList.appendChild(table);
    };

    const populateVehicleSelect = () => {
        scheduleVehicleSelect.innerHTML = '<option value="">Selecione um veículo</option>'; // Limpa e adiciona opção padrão
        vehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.id;
            option.textContent = `${vehicle.make} ${vehicle.model} (${vehicle.plate})`;
            scheduleVehicleSelect.appendChild(option);
        });
    };

    // --- Funções de Tratamento de Erros/Sucesso ---
     const showError = (elementId, message) => {
        const errorDiv = document.getElementById(elementId);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
            // Opcional: esconder após um tempo
            // setTimeout(() => hideError(elementId), 5000);
        } else {
            console.error(`Element with ID ${elementId} not found for error message.`);
        }
    };

    const hideError = (elementId) => {
        const errorDiv = document.getElementById(elementId);
        if (errorDiv) {
            errorDiv.classList.remove('show');
            errorDiv.textContent = ''; // Limpa a mensagem
        }
    };

     const showSuccess = (elementId, message) => {
        const successDiv = document.getElementById(elementId);
         if (successDiv) {
             successDiv.textContent = message;
             successDiv.classList.add('show');
             // Esconder após um tempo
             setTimeout(() => hideSuccess(elementId), 3000);
         } else {
             console.error(`Element with ID ${elementId} not found for success message.`);
         }
    };

     const hideSuccess = (elementId) => {
        const successDiv = document.getElementById(elementId);
        if (successDiv) {
            successDiv.classList.remove('show');
            successDiv.textContent = '';
        }
    };

    // --- Funções Utilitárias ---
    const escapeHTML = (str) => {
        if (!str) return '';
        return str.replace(/[&<>"']/g, function (match) {
            return {
                '&': '&',
                '<': '<',
                '>': '>',
                '"': '"',
                "'": ''
            }[match];
        });
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        // Corrige o problema de fuso horário ao criar o objeto Date
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day); // Mês é 0-indexado
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); // Usa UTC para evitar shifts de dia
    }

    // --- Lógica de Negócio (Adicionar, Agendar, Excluir) ---
    const handleAddVehicle = (event) => {
        event.preventDefault();
        hideError('add-vehicle-error'); // Limpa erro anterior

        const formData = new FormData(addVehicleForm);
        const make = formData.get('make').trim();
        const model = formData.get('model').trim();
        const year = parseInt(formData.get('year'), 10);
        const plate = formData.get('plate').trim().toUpperCase();
        const vin = formData.get('vin').trim();

        // Validação Básica
        if (!make || !model || !year || !plate) {
            showError('add-vehicle-error', 'Por favor, preencha todos os campos obrigatórios (Marca, Modelo, Ano, Placa).');
            return;
        }
        if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
             showError('add-vehicle-error', 'Ano inválido.');
            return;
        }
        // Validação simples de placa (pode ser melhorada)
        if (!/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/.test(plate)) {
             showError('add-vehicle-error', 'Formato de placa inválido (ex: AAA-1234 ou AAA1B34).');
             return;
        }
        // Verifica se placa já existe
        if (vehicles.some(v => v.plate === plate)) {
             showError('add-vehicle-error', 'Já existe um veículo com esta placa.');
             return;
        }


        const newVehicle = {
            id: nextVehicleId++,
            make: make,
            model: model,
            year: year,
            plate: plate,
            vin: vin
        };

        vehicles.push(newVehicle);
        saveData();
        addVehicleForm.reset(); // Limpa o formulário
        renderGarage(); // Atualiza a lista na garagem
        populateVehicleSelect(); // Atualiza o select de agendamento
        showView('garage-view'); // Volta para a garagem
        showSuccess('global-message', 'Veículo adicionado com sucesso!'); // Mensagem global
    };

    const handleScheduleMaintenance = (event) => {
        event.preventDefault();
        hideError('schedule-error');
        hideSuccess('schedule-success');

        const formData = new FormData(scheduleMaintenanceForm);
        const vehicleId = parseInt(formData.get('vehicleId'), 10);
        const serviceType = formData.get('serviceType').trim();
        const scheduleDate = formData.get('scheduleDate');
        const notes = formData.get('notes').trim();

        if (!vehicleId || !serviceType || !scheduleDate) {
             showError('schedule-error', 'Por favor, selecione o veículo, tipo de serviço e data.');
            return;
        }
        // Validação de data (simples - não está no passado?)
        const today = new Date();
        today.setHours(0,0,0,0); // Zera hora para comparar só a data
        const selectedDate = new Date(scheduleDate + 'T00:00:00'); // Considera data local

        if (selectedDate < today) {
             showError('schedule-error', 'A data do agendamento não pode ser no passado.');
            return;
        }

        // Aqui você normalmente enviaria para um backend ou calendário
        // Neste exemplo, apenas mostramos uma mensagem de sucesso
        console.log("Agendamento:", { vehicleId, serviceType, scheduleDate, notes });
        showSuccess('schedule-success', `Manutenção "${serviceType}" agendada para ${formatDate(scheduleDate)}!`);
        scheduleMaintenanceForm.reset();
    };

     const handleDeleteVehicle = (vehicleId) => {
        if (confirm('Tem certeza que deseja excluir este veículo e todo o seu histórico de manutenção?')) {
            // Filtra para remover o veículo
            vehicles = vehicles.filter(v => v.id !== vehicleId);
            // Filtra para remover o histórico associado
            maintenanceRecords = maintenanceRecords.filter(m => m.vehicleId !== vehicleId);
            saveData();
            renderGarage();
            populateVehicleSelect();
             // Se estiver na tela de detalhes do veículo excluído, volta para a garagem
            if (currentDetailVehicleId === vehicleId) {
                showView('garage-view');
                 currentDetailVehicleId = null;
            }
            showSuccess('global-message', 'Veículo excluído com sucesso.');
        }
    };

    const handleAddMaintenanceRecord = (event) => {
        event.preventDefault();
        hideError('add-maintenance-error');

        const vehicleId = parseInt(maintenanceVehicleIdInput.value, 10);
        const date = document.getElementById('maint-date').value;
        const service = document.getElementById('maint-service').value.trim();
        const cost = document.getElementById('maint-cost').value; // Vem como string
        const notes = document.getElementById('maint-notes').value.trim();

        if (!vehicleId || !date || !service) {
            showError('add-maintenance-error', 'Data e Serviço Realizado são obrigatórios.');
            return;
        }

        const newRecord = {
            id: nextMaintId++,
            vehicleId: vehicleId,
            date: date,
            service: service,
            cost: cost ? parseFloat(cost) : null, // Converte para número ou null se vazio
            notes: notes
        };

        maintenanceRecords.push(newRecord);
        // Ordena registros por data (mais recente primeiro) antes de salvar/renderizar
        maintenanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveData();
        addMaintenanceForm.reset(); // Limpa o formulário específico
        addMaintenanceForm.classList.add('hidden'); // Esconde o formulário
        addMaintenanceBtn.classList.remove('hidden'); // Mostra o botão de adicionar novamente
        renderMaintenanceHistory(vehicleId); // Re-renderiza o histórico
         showSuccess('global-message', 'Registro de manutenção adicionado.');
    };

     const handleDeleteMaintenanceRecord = (recordId) => {
         if (confirm('Tem certeza que deseja excluir este registro de manutenção?')) {
             maintenanceRecords = maintenanceRecords.filter(m => m.id !== recordId);
             saveData();
             // Re-renderiza o histórico da view atual
             if (currentDetailVehicleId) {
                 renderMaintenanceHistory(currentDetailVehicleId);
             }
             showSuccess('global-message', 'Registro de manutenção excluído.');
         }
     };


    // --- Event Listeners ---
    // Navegação Principal
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = link.getAttribute('data-target');
            if (targetId === 'schedule-view') {
                populateVehicleSelect(); // Atualiza veículos no select de agendamento
            }
            if(targetId === 'add-vehicle-view'){
                 addVehicleForm.reset(); // Limpa form ao navegar para ele
                 hideError('add-vehicle-error');
            }
            showView(targetId);
        });
    });

    // Adicionar Veículo
    addVehicleForm.addEventListener('submit', handleAddVehicle);

    // Agendar Manutenção
    scheduleMaintenanceForm.addEventListener('submit', handleScheduleMaintenance);

    // Ações nos Cards da Garagem (usando delegação de eventos)
    vehicleListContainer.addEventListener('click', (event) => {
        const target = event.target;
        const vehicleId = parseInt(target.getAttribute('data-id'), 10);

        if (target.classList.contains('view-details')) {
            renderVehicleDetails(vehicleId);
        } else if (target.classList.contains('schedule-maint-quick')) {
            populateVehicleSelect();
            scheduleVehicleSelect.value = vehicleId; // Pré-seleciona o veículo
            showView('schedule-view');
        } else if (target.classList.contains('delete-vehicle')) {
            handleDeleteVehicle(vehicleId);
        }
    });

    // Botão Voltar na tela de detalhes
    vehicleDetailView.addEventListener('click', (event) => {
         if (event.target.classList.contains('btn-back')) {
             event.preventDefault();
             const targetId = event.target.getAttribute('data-target');
             showView(targetId || 'garage-view'); // Garante que volte para algum lugar
             currentDetailVehicleId = null; // Limpa o ID do veículo em detalhe
         }
    });

     // Botão Adicionar Registro de Manutenção (mostra o form)
    addMaintenanceBtn.addEventListener('click', () => {
        addMaintenanceForm.classList.remove('hidden');
        addMaintenanceBtn.classList.add('hidden');
        hideError('add-maintenance-error'); // Limpa erro se houver
        // Focar no primeiro campo do form pode ser útil
        document.getElementById('maint-date').focus();
    });

     // Botão Cancelar no form de adicionar manutenção
    cancelAddMaintenanceBtn.addEventListener('click', () => {
        addMaintenanceForm.classList.add('hidden');
        addMaintenanceBtn.classList.remove('hidden');
        hideError('add-maintenance-error');
        addMaintenanceForm.reset(); // Limpa campos
    });

    // Adicionar Registro de Manutenção (submit do form)
    addMaintenanceForm.addEventListener('submit', handleAddMaintenanceRecord);

    // Excluir Registro de Manutenção (delegação de evento na lista)
    maintenanceHistoryList.addEventListener('click', (event) => {
         if (event.target.classList.contains('delete-maint')) {
             const recordId = parseInt(event.target.getAttribute('data-id'), 10);
             handleDeleteMaintenanceRecord(recordId);
         }
    });


    // --- Inicialização ---
    const initializeApp = () => {
        renderGarage();
        populateVehicleSelect(); // Popula mesmo que não esteja visível inicialmente
        showView('garage-view'); // Define a view inicial
    };

    initializeApp();
});