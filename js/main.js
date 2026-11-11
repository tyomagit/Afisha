"use strict";

const eventById = new Map(events.map((event) => [event.id, event]));
const urlParams = new URLSearchParams(window.location.search);
const selectedEvent = eventById.get(urlParams.get("event"));
const formatPrice = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function pluralEvents(count) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "событий";
  if (lastDigit === 1) return "событие";
  if (lastDigit >= 2 && lastDigit <= 4) return "события";
  return "событий";
}

function initCatalog() {
  const form = document.getElementById("filters");
  if (!form) return;

  const cards = [...document.querySelectorAll("[data-event-card]")];
  const countLabel = document.getElementById("result-count");
  const emptyState = document.getElementById("empty-state");
  const category = urlParams.get("category");

  if (events.some((event) => event.category === category)) {
    form.elements.category.value = category;
  }

  function applyFilters() {
    const fields = new FormData(form);
    const search = fields.get("search").trim().toLocaleLowerCase("ru-RU");
    const category = fields.get("category");
    const date = fields.get("date");
    const price = fields.get("price");
    let count = 0;

    for (const card of cards) {
      const event = eventById.get(card.dataset.eventCard);
      const priceMatches =
        !price ||
        (price === "free" ? event.price === 0 : event.price <= Number(price));
      const visible =
        event.title.toLocaleLowerCase("ru-RU").includes(search) &&
        (!category || category === event.category) &&
        (!date || event.date >= date) &&
        priceMatches;
      const layoutItem = card.closest("[data-card-wrapper]") || card;
      layoutItem.hidden = !visible;
      if (visible) count += 1;
    }

    countLabel.textContent = `${count} ${pluralEvents(count)}`;
    emptyState.hidden = count > 0;
  }

  form.addEventListener("input", applyFilters);
  form.addEventListener("reset", () =>
    window.requestAnimationFrame(applyFilters),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
  });
  applyFilters();
}

function initEventPage() {
  if (!document.getElementById("event-page")) return;

  const event = selectedEvent || events[0];
  const image = document.getElementById("event-image");
  image.src = `images/${event.image}`;
  image.alt = event.alt;
  const extraImage = document.getElementById("event-extra-image");
  extraImage.src = `images/${event.image.replace(".jpg", "-extra.jpg")}`;
  extraImage.alt = event.extraAlt;

  const values = {
    "event-category": event.category,
    "event-title": event.title,
    "event-subtitle": `${event.displayDate} · ${event.time} · ${event.venue}`,
    "event-description": event.text,
    "event-start": `${event.displayDate}, ${event.time}`,
    "event-venue": event.address,
    "event-duration": event.duration,
    "event-age": event.age,
    "event-price": event.displayPrice,
  };
  for (const [id, value] of Object.entries(values)) {
    document.getElementById(id).textContent = value;
  }
  document.title = `${event.title} · Вне дома`;
  document.querySelector(".breadcrumbs [aria-current]").textContent =
    event.title;
  document.getElementById("event-order").href = `order.html?event=${event.id}`;
  document.getElementById("event-quick").dataset.openOrder = event.id;

  const rows = event.price
    ? [
        ["Стандарт", "Вход на мероприятие", formatPrice.format(event.price)],
        [
          "Приоритет",
          "Доступ в отдельную зону",
          formatPrice.format(event.price + 600),
        ],
      ]
    : [["Свободный вход", "Регистрация на мероприятие", "Бесплатно"]];
  const body = document.getElementById("ticket-rows");
  body.replaceChildren();
  for (const [name, condition, price] of rows) {
    const row = body.insertRow();
    const heading = document.createElement("th");
    heading.scope = "row";
    heading.textContent = name;
    row.append(heading);
    row.insertCell().textContent = condition;
    row.insertCell().textContent = price;
  }
}

function fillEvent(form, event) {
  if (!event) return;
  form.elements.event.value = event.id;
  form.elements.date.value = event.date;
  form.elements.date.setCustomValidity("");
}

function initForms() {
  for (const form of document.querySelectorAll("[data-form]")) {
    const { elements } = form;
    const status = form.querySelector("[role=status]");
    const booking = Boolean(elements.event);
    if (form.dataset.form === "order") fillEvent(form, selectedEvent);

    function validate() {
      elements.name.setCustomValidity(
        elements.name.value && !elements.name.value.trim()
          ? "Укажите имя."
          : "",
      );
      if (!booking) {
        elements.comment.setCustomValidity(
          elements.comment.value && !elements.comment.value.trim()
            ? "Введите сообщение."
            : "",
        );
        return;
      }
      const event = eventById.get(elements.event.value);
      elements.date.setCustomValidity(
        event && elements.date.value && elements.date.value !== event.date
          ? "Укажите дату выбранного мероприятия."
          : "",
      );
      const phone = elements.phone.value.trim();
      const validPhone =
        /^[+\d ()-]+$/.test(phone) && phone.replace(/\D/g, "").length >= 7;
      elements.phone.setCustomValidity(
        phone && !validPhone ? "Введите номер телефона с кодом." : "",
      );
    }

    elements.event?.addEventListener("change", () => {
      const event = eventById.get(elements.event.value);
      if (event) fillEvent(form, event);
      else elements.date.value = "";
      validate();
    });
    form.addEventListener("input", () => {
      status.hidden = true;
      validate();
    });
    form.addEventListener("reset", () => {
      status.hidden = true;
      for (const field of form.querySelectorAll("input, textarea"))
        field.setCustomValidity("");
    });

    form.addEventListener("submit", (submitEvent) => {
      submitEvent.preventDefault();
      validate();
      if (!form.reportValidity()) return;
      const event = booking ? eventById.get(elements.event.value) : null;
      form.reset();
      if (event) fillEvent(form, event);
      status.textContent = booking
        ? `Заявка на «${event.title}» прошла проверку. Данные не отправлены.`
        : "Сообщение прошло проверку. Данные не отправлены.";
      status.hidden = false;
      status.focus();
    });
    form.querySelector('button[type="submit"]').disabled = false;
  }
}

function initModal() {
  const modal = document.getElementById("order-modal");
  if (!modal) return;

  const form = modal.querySelector("form");
  const heading = document.getElementById("modal-title");
  let opener;
  const isNative = modal instanceof HTMLDialogElement;
  const bootstrapModal = isNative
    ? null
    : window.bootstrap?.Modal.getOrCreateInstance(modal);
  const focusName = () => form.elements.name.focus();

  function resetModal() {
    form.reset();
    opener?.focus();
  }

  if (isNative) {
    modal
      .querySelector("[data-close-order]")
      .addEventListener("click", () => modal.close());
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.close();
    });
    modal.addEventListener("close", resetModal);
  } else {
    modal.addEventListener("shown.bs.modal", focusName);
    modal.addEventListener("hidden.bs.modal", resetModal);
  }

  for (const button of document.querySelectorAll("[data-open-order]")) {
    button.addEventListener("click", () => {
      const event = eventById.get(button.dataset.openOrder);
      if (!event) return;
      opener = button;
      form.reset();
      fillEvent(form, event);
      heading.textContent = `Заявка на «${event.title}»`;

      if (isNative) {
        modal.showModal();
        focusName();
      } else if (bootstrapModal) {
        bootstrapModal.show(button);
      } else {
        window.location.href = `order.html?event=${event.id}`;
      }
    });
  }
}

function initBackTop() {
  const link = document.querySelector(".back-top");
  if (!link) return;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo(0, 0);
    document.querySelector(".brand").focus({ preventScroll: true });
  });
}

initCatalog();
initEventPage();
initForms();
initModal();
initBackTop();
